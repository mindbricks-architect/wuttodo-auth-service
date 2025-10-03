const { injectAuth } = require("mindbricks-auth-face");

/* This section defines the default theme settings for the authentication UI. */
const DEFAULT_THEME = {
  mode: "dark",
  font: {
    family: "Inter",
    sizes: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
    },
  },
  colors: {
    primary: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },
    secondary: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
    accent: {
      50: "#fdf4ff",
      100: "#fae8ff",
      200: "#f5d0fe",
      300: "#f0abfc",
      400: "#e879f9",
      500: "#d946ef",
      600: "#c026d3",
      700: "#a21caf",
      800: "#86198f",
      900: "#701a75",
    },
  },
  borderRadius: {
    sm: "0.125rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    "2xl": "1rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  },
  animations: {
    enabled: true,
    duration: {
      fast: "150ms",
      normal: "300ms",
      slow: "500ms",
    },
  },
};

module.exports = (app) => {
  const authUrl = (process.env.SERVICE_URL ?? "mindbricks.com").replace(
    process.env.SERVICE_SHORT_NAME,
    "auth",
  );

  const config = {
    app: {
      name: "wuttodo",
      version: process.env.SERVICE_VERSION || "1.0.0",
      url: authUrl,
      logo: "https://mindbricks.com/favicon.ico",
      showLogo: true,
    },
    theme: DEFAULT_THEME,
    features: {
      login: {},
      register: {},
      forgotPassword: {
        enable: false,
      },
      resetPassword: {
        enable: false,
      },
      smsOtp: {
        enable: false,
      },
      authenticatorOtp: {
        enable: false,
      },
      socialLogin: {},
    },
  };

  // Configuration settings related to the login feature.
  config.features["login"] = {
    enable: true,
    useJWT: true,
    api: {
      url: "/login",
      method: "POST",
    },
    storage: {
      enable: true,
      type: "cookie",
      key: "------", // The project's cookie key should be specified here.
    },
  };

  // Configuration settings related to the registration feature.
  config.features["register"] = {
    enable: true, // Eğer kayıt ol serviste açıksa.
    api: {
      url: "/register",
      method: "POST",
    },
    fields: {
      firstName: {
        key: "firstName",
        type: "text",
        enable: true,
        required: true,
        label: "Adınız",
        placeholder: "Adınızı giriniz",
      },
      lastName: {
        key: "lastName",
        type: "text",
        enable: true,
        required: true,
        label: "Soyadınız",
        placeholder: "Soyadınız giriniz",
      },
    },
    emailVerification: {
      enable: true,
      required: true,
    },
  };

  // Configuration settings related to email verification.
  config.features["emailVerification"] = {
    enable: true,
    api: {
      verify: {
        url: "/api/auth/verify-email",
        method: "POST",
        mapping: {
          token: "token",
        },
      },
      resend: {
        url: "/api/auth/resend-verification",
        method: "POST",
        mapping: {
          email: "email",
        },
      },
    },
  };

  // Configuration settings for social login providers.
  config.features["emailVerification"] = {
    enable: true,
    providers: {
      google: {
        enable: true,
        clientId: "xxxxxxxxxxxx",
        redirectUrl: "/auth/redirect/provider",
      },
      github: {
        enable: true,
        clientId: "xxxxxxxxxxxx",
        redirectUrl: "/auth/redirect/provider",
      },
      gitlab: {
        enable: true,
        clientId: "xxxxxxxxxxxx",
        redirectUrl: "/auth/redirect/provider",
      },
      apple: {
        enable: true,
        clientId: "xxxxxxxxxxxx",
        redirectUrl: "/auth/redirect/provider",
      },
    },
  };

  injectAuth(app, config);
};
