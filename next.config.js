module.exports = {
    reactStrictMode: true,
    webpack: (config) => {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        os: require.resolve('os-browserify'),
        path: require.resolve('path-browserify'),
      };
      return config;
    },
  };