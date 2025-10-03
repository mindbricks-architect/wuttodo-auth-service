/**
 * A Node.js client for Google Maps Platform web services. Enables geocoding, places search,
 * directions, distance matrix, elevation, timezone, roads, and static maps URL generation.
 *
 * @class
 * @label "Google Maps"
 * @icon https://maps.gstatic.com/mapfiles/api-3/images/mapcnt6.png
 * @className GoogleMapsApiClient
 * @npm_sdk @googlemaps/google-maps-services-js
 */

const { Client } = require("@googlemaps/google-maps-services-js");
const crypto = require("crypto"); // used for optional URL signing (if server-side signing is preferred)

/** Reusable enums for UI controls */
const TRAVEL_MODE = /** @enumRef TRAVEL_MODE */ [
  "driving",
  "walking",
  "bicycling",
  "transit",
];
const TRAFFIC_MODEL = /** @enumRef TRAFFIC_MODEL */ [
  "best_guess",
  "pessimistic",
  "optimistic",
];
const TRANSIT_MODE = /** @enumRef TRANSIT_MODE */ [
  "bus",
  "subway",
  "train",
  "tram",
  "rail",
];
const TRANSIT_ROUTING_PREFERENCE = /** @enumRef TRANSIT_ROUTING_PREFERENCE */ [
  "less_walking",
  "fewer_transfers",
];
const UNITS = /** @enumRef UNITS */ ["metric", "imperial"];

/**
 * CommonJS Google Maps API client wrapper.
 *
 * @constructor
 * @param {Object} config
 * @param {string} config.apiKey Your Google Maps Platform API key.
 * @param {number} [config.timeoutMs=10000] Request timeout in milliseconds.
 * @param {string} [config.language] Default language for results (e.g., "en", "tr").
 * @param {string} [config.region] Bias results towards a region (e.g., "tr", "us").
 * @param {Object} [config.requestOptions] Additional request options passed to SDK calls.
 * @param {string} [config.urlSigningSecret] Optional URL signing secret for Static Maps (enterprise).
 */
class GoogleMapsApiClient {
  constructor(config = {}) {
    this.config = {
      timeoutMs: 10000,
      ...config,
    };
    this._client = null;

    /** @private */
    this._initPromise = null;
    /** @private */
    this.ready = false;
    /** @private */
    this._closed = false;
  }

  /**
   * Performs provider-specific startup (e.g., connect/auth/init).
   * Safe to call multiple times; no-ops after first success.
   * @function _init
   * @group Init
   * @label Initialize Client
   * @returns {Promise<void>} Resolves when the client is ready.
   */
  async _init() {
    if (this.ready && this._initPromise) return this._initPromise;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      if (!this.config.apiKey) {
        throw new Error("GoogleMapsApiClient: Missing required config.apiKey");
      }
      if (this._closed) this._closed = false;

      // Create the SDK client (no network call yet)
      this._client = new Client({});

      // Lightweight verification call (Timezone) to validate key & quotas.
      // If your policy avoids test calls, you may skip; here we follow the prompt to verify.
      const testParams = {
        params: {
          key: this.config.apiKey,
          timestamp: Math.floor(Date.now() / 1000),
          location: { lat: 0, lng: 0 },
          language: this.config.language,
        },
        timeout: this.config.timeoutMs,
      };

      try {
        await this._client.timezone(testParams);
      } catch (err) {
        // Surface provider error as-is
        throw new Error(
          `GoogleMapsApiClient _init failed: ${this._extractError(err)}`,
        );
      }

      this.ready = true;
      return {
        ok: true,
        message: "Google Maps client initialized and API key verified.",
      };
    })();

    try {
      await this._initPromise;
    } catch (e) {
      // If init fails, reset promise/ready so caller can retry later
      this._initPromise = null;
      this.ready = false;
      throw e;
    }
    return this._initPromise;
  }

  /**
   * Releases underlying resources initialized in _init().
   * Calls provider-specific cleanup (disconnect/close) if available.
   * Safe to call multiple times.
   * @function _close
   * @group Init
   * @label Close Client
   * @returns {Promise<void>} Resolves when cleanup is complete.
   */
  async _close() {
    // @googlemaps/google-maps-services-js is stateless; nothing to disconnect.
    this._client = null;
    this._closed = true;
    this.ready = false;
    this._initPromise = null;
  }

  /** @private */
  async _ensureReady() {
    if (this._closed) {
      throw new Error(
        "GoogleMapsApiClient is closed. Call _init() again to reuse.",
      );
    }
    if (!this.ready) {
      await this._init();
    }
  }

  /** @private */
  _baseParams(extra = {}) {
    const { apiKey, language, region } = this.config;
    return { key: apiKey, language, region, ...extra };
  }

  /** @private */
  _extractError(err) {
    if (!err) return "Unknown error";
    if (err.response?.data?.error_message)
      return err.response.data.error_message;
    if (err.response?.data?.error) return String(err.response.data.error);
    if (err.message) return err.message;
    return String(err);
  }

  // ---------------------------
  // Geocoding
  // ---------------------------

  /**
   * Forward geocoding: address → coordinates and details.
   * @function geocode
   * @group Geocoding
   * @label Geocode Address
   * @param {Object} input
   * @param {string} input.address Human-readable address to geocode.
   * @param {string} [input.bounds] Bias the results within bounds (sw:ne as "lat,lng|lat,lng").
   * @param {string} [input.components] Component filters (e.g., "country:tr").
   * @param {string} [input.place_id] If provided, geocodes by place_id instead of address.
   * @returns {Promise<Object>} Geocoding response data.
   */
  async geocode(input) {
    await this._ensureReady();
    const params = this._baseParams({
      address: input.place_id ? undefined : input.address,
      place_id: input.place_id,
      bounds: input.bounds,
      components: input.components,
    });
    const res = await this._client.geocode({
      params,
      timeout: this.config.timeoutMs,
      ...this.config.requestOptions,
    });
    return res.data;
  }

  /**
   * Reverse geocoding: coordinates → nearest address/places.
   * @function reverseGeocode
   * @group Geocoding
   * @label Reverse Geocode
   * @param {Object} input
   * @param {number} input.lat Latitude.
   * @param {number} input.lng Longitude.
   * @param {string[]} [input.result_type] Restrict results by types.
   * @param {string[]} [input.location_type] Filter by location_type.
   * @returns {Promise<Object>} Reverse geocoding response data.
   */
  async reverseGeocode(input) {
    await this._ensureReady();
    const params = this._baseParams({
      latlng: `${input.lat},${input.lng}`,
      result_type: input.result_type?.join("|"),
      location_type: input.location_type?.join("|"),
    });
    const res = await this._client.reverseGeocode({
      params,
      timeout: this.config.timeoutMs,
      ...this.config.requestOptions,
    });
    return res.data;
  }

  // ---------------------------
  // Places
  // ---------------------------

  /**
   * Find a place by text (name, address, phone).
   * @function findPlaceFromText
   * @group Places
   * @label Find Place From Text
   * @param {Object} input
   * @param {string} input.input The text to search (name, address, etc.).
   * @param {("textquery"|"phonenumber")} [input.inputtype="textquery"] The input type.
   * @param {string[]} [input.fields] Fields to return (e.g., ["place_id","name","geometry"]).
   * @param {string} [input.locationbias] e.g., "circle:2000@41.0082,28.9784" (Istanbul center).
   * @returns {Promise<Object>} Places response data.
   */
  async findPlaceFromText(input) {
    await this._ensureReady();
    const params = this._baseParams({
      input: input.input,
      inputtype: input.inputtype || "textquery",
      fields: input.fields?.join(","),
      locationbias: input.locationbias,
    });
    const res = await this._client.findPlaceFromText({
      params,
      timeout: this.config.timeoutMs,
      ...this.config.requestOptions,
    });
    return res.data;
  }

  /**
   * Nearby search around a point.
   * @function nearbySearch
   * @group Places
   * @label Nearby Search
   * @param {Object} input
   * @param {number} input.lat Latitude.
   * @param {number} input.lng Longitude.
   * @param {number} [input.radius=1000] Search radius in meters.
   * @param {string} [input.keyword] Filter by keyword.
   * @param {string} [input.type] Place type (e.g., "restaurant", "cafe").
   * @param {string} [input.pagetoken] For pagination.
   * @returns {Promise<Object>} Places nearby search response.
   */
  async nearbySearch(input) {
    await this._ensureReady();
    const params = this._baseParams({
      location: `${input.lat},${input.lng}`,
      radius: input.radius ?? 1000,
      keyword: input.keyword,
      type: input.type,
      pagetoken: input.pagetoken,
    });
    const res = await this._client.placesNearby({
      params,
      timeout: this.config.timeoutMs,
      ...this.config.requestOptions,
    });
    return res.data;
  }

  /**
   * Text search for places (free text).
   * @function textSearch
   * @group Places
   * @label Text Search
   * @param {Object} input
   * @param {string} input.query Text query, e.g., "coffee in Istanbul".
   * @param {number} [input.lat] Optional bias latitude.
   * @param {number} [input.lng] Optional bias longitude.
   * @param {number} [input.radius] Bias radius in meters.
   * @param {string} [input.pagetoken] For pagination.
   * @returns {Promise<Object>} Places text search response.
   */
  async textSearch(input) {
    await this._ensureReady();
    const params = this._baseParams({
      query: input.query,
      location:
        input.lat != null && input.lng != null
          ? `${input.lat},${input.lng}`
          : undefined,
      radius: input.radius,
      pagetoken: input.pagetoken,
    });
    const res = await this._client.textSearch({
      params,
      timeout: this.config.timeoutMs,
      ...this.config.requestOptions,
    });
    return res.data;
  }

  /**
   * Get details for a place by place_id.
   * @function placeDetails
   * @group Places
   * @label Place Details
   * @param {Object} input
   * @param {string} input.place_id The place ID.
   * @param {string[]} [input.fields] Fields to return (e.g., ["name","rating","opening_hours"]).
   * @returns {Promise<Object>} Place Details response.
   */
  async placeDetails(input) {
    await this._ensureReady();
    const params = this._baseParams({
      place_id: input.place_id,
      fields: input.fields?.join(","),
    });
    const res = await this._client.placeDetails({
      params,
      timeout: this.config.timeoutMs,
      ...this.config.requestOptions,
    });
    return res.data;
  }

  /**
   * Get a public URL to a place photo (useful for downloading via your own HTTP client).
   * @function placePhotoUrl
   * @group Places
   * @label Place Photo URL
   * @param {Object} input
   * @param {string} input.photo_reference Photo reference from Places APIs.
   * @param {number} [input.maxwidth] Desired width in px (alternative: maxheight).
   * @param {number} [input.maxheight] Desired height in px.
   * @returns {Promise<string>} A direct photo URL.
   */
  async placePhotoUrl(input) {
    await this._ensureReady();
    const base = "https://maps.googleapis.com/maps/api/place/photo";
    const params = new URLSearchParams({
      key: this.config.apiKey,
      photoreference: input.photo_reference,
    });
    if (input.maxwidth) params.set("maxwidth", String(input.maxwidth));
    if (input.maxheight) params.set("maxheight", String(input.maxheight));
    return `${base}?${params.toString()}`;
  }

  // ---------------------------
  // Directions & Distance
  // ---------------------------

  /**
   * Get directions between origin and destination.
   * @function directions
   * @group Directions
   * @label Get Directions
   * @param {Object} input
   * @param {string|Object} input.origin Address string or {lat,lng}.
   * @param {string|Object} input.destination Address string or {lat,lng}.
   * @param {("driving"|"walking"|"bicycling"|"transit")} [input.mode="driving"] @enumRef TRAVEL_MODE
   * @param {string[]} [input.waypoints] Optional waypoints.
   * @param {boolean} [input.alternatives=false] Return multiple routes.
   * @param {("best_guess"|"pessimistic"|"optimistic")} [input.traffic_model] @enumRef TRAFFIC_MODEL
   * @param {string} [input.departure_time] "now" or epoch seconds for traffic-aware routes.
   * @param {string[]} [input.transit_mode] @enumRef TRANSIT_MODE
   * @param {("less_walking"|"fewer_transfers")} [input.transit_routing_preference] @enumRef TRANSIT_ROUTING_PREFERENCE
   * @returns {Promise<Object>} Directions response.
   */
  async directions(input) {
    await this._ensureReady();
    const params = this._baseParams({
      origin: this._fmtLatLngOrString(input.origin),
      destination: this._fmtLatLngOrString(input.destination),
      mode: input.mode || "driving",
      waypoints: input.waypoints?.join("|"),
      alternatives: input.alternatives ?? false,
      traffic_model: input.traffic_model,
      departure_time: input.departure_time,
      transit_mode: input.transit_mode?.join("|"),
      transit_routing_preference: input.transit_routing_preference,
    });
    const res = await this._client.directions({
      params,
      timeout: this.config.timeoutMs,
      ...this.config.requestOptions,
    });
    return res.data;
  }

  /**
   * Compute distances and durations between origins and destinations.
   * @function distanceMatrix
   * @group Distance
   * @label Distance Matrix
   * @param {Object} input
   * @param {(string|Object)[]} input.origins List of addresses or {lat,lng}.
   * @param {(string|Object)[]} input.destinations List of addresses or {lat,lng}.
   * @param {("driving"|"walking"|"bicycling"|"transit")} [input.mode="driving"] @enumRef TRAVEL_MODE
   * @param {("metric"|"imperial")} [input.units="metric"] @enumRef UNITS
   * @param {string} [input.departure_time] "now" or epoch seconds (for traffic).
   * @param {("best_guess"|"pessimistic"|"optimistic")} [input.traffic_model] @enumRef TRAFFIC_MODEL
   * @returns {Promise<Object>} Distance Matrix response.
   */
  async distanceMatrix(input) {
    await this._ensureReady();
    const params = this._baseParams({
      origins: input.origins.map((o) => this._fmtLatLngOrString(o)),
      destinations: input.destinations.map((d) => this._fmtLatLngOrString(d)),
      mode: input.mode || "driving",
      units: input.units || "metric",
      departure_time: input.departure_time,
      traffic_model: input.traffic_model,
    });
    const res = await this._client.distancematrix({
      params,
      timeout: this.config.timeoutMs,
      ...this.config.requestOptions,
    });
    return res.data;
  }

  // ---------------------------
  // Elevation & Time Zone
  // ---------------------------

  /**
   * Get elevation for one or more points.
   * @function elevation
   * @group Elevation
   * @label Elevation for Locations
   * @param {Object} input
   * @param {{lat:number,lng:number}[]} input.locations Array of coordinates.
   * @returns {Promise<Object>} Elevation response.
   */
  async elevation(input) {
    await this._ensureReady();
    const params = this._baseParams({
      locations: input.locations
        .map(({ lat, lng }) => `${lat},${lng}`)
        .join("|"),
    });
    const res = await this._client.elevation({
      params,
      timeout: this.config.timeoutMs,
      ...this.config.requestOptions,
    });
    return res.data;
  }

  /**
   * Get time zone for a location and timestamp.
   * @function timezone
   * @group Time Zone
   * @label Time Zone
   * @param {Object} input
   * @param {number} input.lat Latitude.
   * @param {number} input.lng Longitude.
   * @param {number} input.timestamp Epoch seconds.
   * @returns {Promise<Object>} Timezone response.
   */
  async timezone(input) {
    await this._ensureReady();
    const params = this._baseParams({
      location: `${input.lat},${input.lng}`,
      timestamp: input.timestamp,
    });
    const res = await this._client.timezone({
      params,
      timeout: this.config.timeoutMs,
      ...this.config.requestOptions,
    });
    return res.data;
  }

  // ---------------------------
  // Roads
  // ---------------------------

  /**
   * Snap GPS points to nearest roads, returning interpolated path.
   * @function snapToRoads
   * @group Roads
   * @label Snap To Roads
   * @param {Object} input
   * @param {{lat:number,lng:number}[]} input.path Path of coordinates.
   * @param {boolean} [input.interpolate=true] Return interpolated points.
   * @returns {Promise<Object>} Roads response.
   */
  async snapToRoads(input) {
    await this._ensureReady();
    const params = this._baseParams({
      path: input.path.map(({ lat, lng }) => `${lat},${lng}`).join("|"),
      interpolate: input.interpolate ?? true,
    });
    const res = await this._client.snapToRoads({
      params,
      timeout: this.config.timeoutMs,
      ...this.config.requestOptions,
    });
    return res.data;
  }

  /**
   * Find the closest road segments for given points (no path interpolation).
   * @function nearestRoads
   * @group Roads
   * @label Nearest Roads
   * @param {Object} input
   * @param {{lat:number,lng:number}[]} input.points Points to match to roads.
   * @returns {Promise<Object>} Roads response.
   */
  async nearestRoads(input) {
    await this._ensureReady();
    const params = this._baseParams({
      points: input.points.map(({ lat, lng }) => `${lat},${lng}`).join("|"),
    });
    const res = await this._client.nearestRoads({
      params,
      timeout: this.config.timeoutMs,
      ...this.config.requestOptions,
    });
    return res.data;
  }

  // ---------------------------
  // Static Maps (URL generation)
  // ---------------------------

  /**
   * Build a Static Maps image URL. Optionally sign the URL if `urlSigningSecret` is configured.
   * @function buildStaticMapUrl
   * @group Static Maps
   * @label Build Static Map URL
   * @param {Object} input
   * @param {string} [input.center] Center as "lat,lng" or address (omit if using markers/paths only).
   * @param {number} [input.zoom] Zoom level (1-21).
   * @param {string} [input.size="600x400"] Image size "WIDTHxHEIGHT".
   * @param {string[]} [input.markers] Marker specs (e.g., "color:red|label:C|41.0082,28.9784").
   * @param {string[]} [input.paths] Path specs (e.g., "color:0x0000ff|weight:3|41,29|41.1,29.1").
   * @param {string} [input.maptype] "roadmap"|"satellite"|"terrain"|"hybrid".
   * @param {number} [input.scale] 1 or 2.
   * @param {string} [input.format] "png"|"jpg"|"gif".
   * @returns {Promise<string>} A URL to the static map image.
   */
  async buildStaticMapUrl(input = {}) {
    await this._ensureReady();
    const base = "https://maps.googleapis.com/maps/api/staticmap";
    const params = new URLSearchParams();
    if (input.center) params.set("center", input.center);
    if (input.zoom != null) params.set("zoom", String(input.zoom));
    params.set("size", input.size || "600x400");
    if (input.maptype) params.set("maptype", input.maptype);
    if (input.scale) params.set("scale", String(input.scale));
    if (input.format) params.set("format", input.format);

    (input.markers || []).forEach((m) => params.append("markers", m));
    (input.paths || []).forEach((p) => params.append("path", p));

    params.set("key", this.config.apiKey);

    const unsignedUrl = `${base}?${params.toString()}`;
    if (!this.config.urlSigningSecret) return unsignedUrl;

    // Optional URL signing (enterprise usage). Expects a URL-safe base64 secret.
    const url = new URL(unsignedUrl);
    const pathAndQuery = url.pathname + url.search;
    const decodedSecret = this._base64UrlDecode(this.config.urlSigningSecret);
    const signature = crypto
      .createHmac("sha1", decodedSecret)
      .update(pathAndQuery)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    return `${unsignedUrl}&signature=${signature}`;
  }

  // ---------------------------
  // Utilities
  // ---------------------------

  /** @private */
  _fmtLatLngOrString(v) {
    if (typeof v === "string") return v;
    if (v && typeof v === "object" && "lat" in v && "lng" in v) {
      return `${v.lat},${v.lng}`;
    }
    throw new Error("Expected string or {lat,lng}");
  }

  /** @private */
  _base64UrlDecode(input) {
    // Convert URL-safe base64 to standard base64
    const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(b64, "base64");
  }
}

module.exports = GoogleMapsApiClient;
