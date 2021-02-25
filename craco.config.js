const CracoLessPlugin = require("craco-less");
const solana = require("@solana/web3.js");
const clusterApiUrl = solana.clusterApiUrl;

module.exports = {
  devServer: {
    allowedHosts: [
      'https://solana-api.projectserum.com/',
      clusterApiUrl("testnet"),
      clusterApiUrl("devnet"),
      "http://127.0.0.1:8899"
    ],
  },
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            modifyVars: { "@primary-color": "#2abdd2" },
            javascriptEnabled: true,
          },
        },
      },
    },
  ],
};
