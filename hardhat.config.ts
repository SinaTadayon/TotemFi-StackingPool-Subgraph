import { HardhatUserConfig } from "hardhat/config"
import { HttpNetworkUserConfig } from "hardhat/types"

import "@nomiclabs/hardhat-ethers"
import "hardhat-deploy"
import "./src/subgraph"

// read MNEMONIC from env variable
let mnemonic = process.env.MNEMONIC
let privateKey = process.env.PRIVATE_KEY

const accounts = mnemonic
    ? { mnemonic }
    : privateKey
    ? [`0x${privateKey}`]
    : undefined

const infuraNetwork = (
    network: string,
    chainId?: number,
    gas?: number
): HttpNetworkUserConfig => {
    return {
        url: `https://${network}.infura.io/v3/${process.env.PROJECT_ID}`,
        chainId,
        gas,
        accounts,
    }
}

const config: HardhatUserConfig = {
    networks: {
        hardhat: mnemonic ? { accounts: { mnemonic } } : {},
        localhost: {
            url: "http://localhost:8545",
            accounts,
        },
        mainnet: infuraNetwork("mainnet", 1, 6283185),
        rinkeby: infuraNetwork("rinkeby", 4, 6283185),
        kovan: infuraNetwork("kovan", 42, 6283185),
        goerli: infuraNetwork("goerli", 5, 6283185),
        matic_testnet: {
            url: "https://rpc-mumbai.matic.today",
            chainId: 80001,
            accounts,
        },
        bsc: {
            url: "https://bsc-dataseed.binance.org/",
            chainId: 56,
            gasPrice: 20000000000,
            accounts,
        },
        bsc_testnet: {
            url: "https://data-seed-prebsc-1-s1.binance.org:8545",
            chainId: 97,
            accounts,
        },
    },
    solidity: {
        version: "0.7.4",
        settings: {
            optimizer: {
                enabled: true,
            },
        },
    },
    paths: {
        artifacts: "artifacts",
        deploy: "deploy",
        deployments: "deployments",
    },
    external: {
        contracts: [
            {
                artifacts: "contracts/export/artifacts",
                deploy: "contracts/deploy",
            },
        ],
        deployments: {
            localhost: ["contracts/deployments/localhost"],
            bsc: ["contracts/deployments/bsc"],
            bsc_testnet: ["contracts/deployments/bsc_testnet"],
            goerli: ["contracts/deployments/goerli"],
            ropsten: ["contracts/deployments/ropsten"],
            mainnet: ["contracts/deployments/mainnet"],
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
}

export default config
