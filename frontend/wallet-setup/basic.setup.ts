import { defineWalletSetup } from '@synthetixio/synpress'
import { MetaMask } from '@synthetixio/synpress/playwright'

// Test seed phrase — Foundry/Hardhat standard test wallet (NEVER use for real funds)
const SEED_PHRASE =
  'test test test test test test test test test test test junk'

export const PASSWORD = 'Testpass1!'

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, PASSWORD)

  // Import the test wallet — Arc Testnet is added via the app's wallet_addEthereumChain
  // during the test, so we don't need to add it here (avoids MetaMask UI version mismatches)
  await metamask.importWallet(SEED_PHRASE)
})
