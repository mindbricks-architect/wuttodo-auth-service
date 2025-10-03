# Business API Design Specification - `List Users`

A Business API is a set of logical actions centered around a main data object. These actions can range from simple CRUD operations to complex workflows that implement intricate business logic.

While the term “API” traditionally refers to an interface that allows software systems to interact, in Mindbricks a Business API represents a broader concept. It encapsulates a business workflow around a data object, going beyond basic CRUD operations to include rich, internally coordinated actions that can be fully designed and customized.

This document provides an in-depth explanation of the architectural design of the `listUsers` Business API. It is intended to guide backend architects and developers in maintaining the current design. Additionally, frontend developers and frontend AI agents can use this document to understand how to properly consume this API on the client side.

## Main Data Object and CRUD Operation

The `listUsers` Business API is designed to handle a `list` operation on the `User` data object. This operation is performed under the specified conditions and may include additional, coordinated actions as part of the workflow.

## API Description

## API Options

- **Auto Params** : `true`
  Determines whether input parameters should be auto-generated from the schema of the associated data object. Set to `false` if you want to define all input parameters manually.

- **Raise Api Event** : `true`
  Indicates whether the Business API should emit an API-level event after successful execution. This is typically used for audit trails, analytics, or external integrations.
  The event will be emitted to the `users-listed` Kafka Topic Note that the DB-Level events for `create`, `update` and `delete` operations will always be raised for internal reasons.

- **Active Check** : ``Controls how the system checks if a record is active (not soft-deleted or inactive). Uses the`ApiCheckOption` to determine whether this is checked during the query or after fetching the instance.

- **Read From Entity Cache** : `false`
  If enabled, the API will attempt to read the target object from the Redis entity cache before querying the database. This can improve performance for frequently accessed records.

## API Controllers

A Mindbricks Business API can be accessed through multiple interfaces, including REST, gRPC, WebSocket, Kafka, or Cron. The controllers listed below map the business workflow to a specific interface, enabling consistent interaction regardless of the communication channel.

### REST Controller

The `listUsers` Business API includes a REST controller that can be triggered via the following route:

`/v1/users`

By sending a request to this route using the service API address, you can execute this Business API. Parameters can be provided in multiple HTTP locations, including the URL path, URL query, request body, and request headers. Detailed information about these parameters is provided in the **Parameters** section.

### MCP Tool

REST controllers also expose the Business API as a tool in the MCP, making it accessible to AI agents. This `listUsers` Business API will be registered as a tool on the MCP server within the service binding.

## API Parameters

The `listUsers` Business API does not require any parameters to be provided from the controllers.

## AUTH Configuration

The **authentication and authorization configuration** defines the core access rules for the `listUsers` Business API. These checks are applied **after parameter validation** and before executing the main business logic.

While these settings cover the most common scenarios, more **fine-grained or conditional access control**—such as permissions based on object context, nested memberships, or custom workflows—should be implemented using explicit actions like `PermissionCheckAction`, `MembershipCheckAction`, or `ObjectPermissionCheckAction`.

### Login Requirement

This API **requires login** (`loginRequired = true`). Requests from non-logged-in users will return a **401 Unauthorized** error.
Login is necessary **but not sufficient**, as additional role, permission, or other authorization checks may still apply.

---

### Ownership Checks

---

### Role and Permission Settings

- **Absolute roles** (bypass all auth checks):  
  Users with any of the following roles will bypass all authentication and authorization checks, including ownership, membership, and standard role/permission checks:  
  `[superAdmin, admin]`

- **Check roles** (must pass basic role checks):  
  Users must have at least one of the following roles to execute this API:  
  `[superAdmin`, `admin]`

---

## Select Clause

Specifies which fields will be selected from the main data object during a `get` or `list` operation. Leave blank to select all properties. This applies only to `get` and `list` type APIs.",

``

## Where Clause

Defines the criteria used to locate the target record(s) for the main operation. This is expressed as a query object and applies to `get`, `list`, `update`, and `delete` APIs. All API types except `list` are expected to affect a single record.

_If nothing is configured for (get, update, delete) the id fields will be the select criteria._

**Select By**:
A list of fields that must be matched exactly as part of the WHERE clause. This is not a filter — it is a required selection rule. In single-record APIs (`get`, `update`, `delete`), it defines how a unique record is located. In `list` APIs, it scopes the results to only entries matching the given values.
Note that `selectBy` fields will be ignored if `fullWhereClause` is set.

_The business api configuration has no `selectBy` setting._

**Full Where Clause**
An MScript query expression that overrides all default WHERE clause logic. Use this for fully customized queries.
When `fullWhereClause` is set, `selectBy` is ignored, however additional selects will still be applied to final where clause.

The business api configuration has no `fullWhereClause` setting.

**Additional Clauses**
A list of conditionally applied MScript query fragments. These clauses are appended only if their conditions evaluate to true. If no condition is set it will be applied to the where clause directly.

The business api configuration has no additionalClauses setting.

**Actual Where Clause**
This where clause is built using whereClause configuration (if set) and default business logic.

```js
{
  $and: [{ isActive: true }];
}
```

## List Options

Defines list-specific options including filtering logic, default sorting, and result customization for APIs that return multiple records.

**List Sort By**
Sort order definitions for the result set. Multiple fields can be provided with direction (asc/desc).

[ id asc ]

**List Group By**
Grouping definitions for the result set. This is typically used for visual or report-based grouping.

_The list is not grouped._

**setAsRead**:
An optional array of field-value mappings that will be updated after the read operation. Useful for marking items as read or viewed.

No `setAsread` field-value pair is configured.

**Permission Filter**
Optional filter that applies permission constraints dynamically based on session or object roles. So that the list items are filtered by the user's OBAC or ABAC permissions.

_Permission filter is not active at the moment. Follow Mindbricks updates to be able to use it._

## Pagination Options

Contains settings to configure pagination behavior for `list` APIs. Includes options like page size, offset, cursor support, and total count inclusion.

## Business Logic Workflow

### [1] Step : startBusinessApi

Initializes context with request and session objects. Prepares internal structures for parameter handling and milestone execution.

You can use the following settings to change some behavior of this step.
`apiOptions`, `restSettings`, `grpcSettings`, `kafkaSettings`, `socketSettings`, `cronSettings`

---

### [2] Step : readParameters

Reads request and Redis parameters, applies defaults, and writes them to context for downstream processing.

You can use the following settings to change some behavior of this step.
`customParameters`, `redisParameters`

---

### [3] Step : transposeParameters

Transforms and normalizes parameters, derives dependent values, and reshapes inputs for the main list query.

---

### [4] Step : checkParameters

Executes validation logic on required and custom parameters, enforcing business rules and cross-field consistency.

---

### [5] Step : checkBasicAuth

Performs role-based access checks and applies dynamic membership or session-based restrictions.

You can use the following settings to change some behavior of this step.
`authOptions`

---

### [6] Step : buildWhereClause

Constructs the main query WHERE clause and applies optional filters or scoped access controls.

You can use the following settings to change some behavior of this step.
`whereClause`

---

### [7] Step : mainListOperation

Executes the paginated database query, retrieves the list, and stores results in context for enrichment.

You can use the following settings to change some behavior of this step.
`selectClause`, `listOptions`, `paginationOptions`

---

### [8] Step : buildOutput

Assembles the list response, sanitizes sensitive fields, applies transformations, and injects extra context if needed.

---

### [9] Step : sendResponse

Sends the paginated list to the client through the controller.

---

### [10] Step : raiseApiEvent

Triggers optional post-workflow events, such as Kafka messages, logs, or system notifications.

---

## Rest Usage

### Rest Client Parameters

Client parameters are the api parameters that are visible to client and will be populated by the client.
Note that some api parameters are not visible to client because they are populated by internal system, session, calculation or joint sources.
The `listUsers` api has got no visible parameters.

### REST Request

To access the api you can use the **REST** controller with the path **GET /v1/users**

```js
axios({
  method: "GET",
  url: "/v1/users",
  data: {},
  params: {},
});
```

### REST Response

The API response is encapsulated within a JSON envelope. Successful operations return an HTTP status code of 200 for get, list, update, or delete requests, and 201 for create requests. Each successful response includes a `"status": "OK"` property. For error handling, refer to the "Error Response" section.

Following JSON represents the most comprehensive form of the **`users`** object in the respones. However, some properties may be omitted based on the object's internal logic.

```json
{
  "status": "OK",
  "statusCode": "200",
  "elapsedMs": 126,
  "ssoTime": 120,
  "source": "db",
  "cacheKey": "hexCode",
  "userId": "ID",
  "sessionId": "ID",
  "requestId": "ID",
  "dataName": "users",
  "method": "GET",
  "action": "list",
  "appVersion": "Version",
  "rowCount": "\"Number\"",
  "users": [
    {
      "id": "ID",
      "_owner": "ID",
      "email": "String",
      "password": "String",
      "fullname": "String",
      "avatar": "String",
      "roleId": "String",
      "emailVerified": "Boolean",
      "isActive": true,
      "recordVersion": "Integer",
      "createdAt": "Date",
      "updatedAt": "Date"
    },
    {},
    {}
  ],
  "paging": {
    "pageNumber": "Number",
    "pageRowCount": "NUmber",
    "totalRowCount": "Number",
    "pageCount": "Number"
  },
  "filters": [],
  "uiPermissions": []
}
```
