import fs from "fs"
import path from "path"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import {
    Deployment,
    DeploymentsExtension,
    Export,
    ExtendedArtifact,
} from "hardhat-deploy/types"
import { task, types } from "hardhat/config"
import { SubgraphManifest } from "../src/thegraph"
import yaml from "js-yaml"

const hexToNumber = (
    value: string | number | undefined
): number | undefined => {
    if (typeof value == "string") {
        return parseInt(value, 16)
    }
    return value
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: SubgraphOptions = {
    inputFile: "./subgraph.template.yaml",
    outputFile: "./subgraph.yaml",
    abiDir: "./abi",
}

interface Resolver {
    /**
     * Resolves the address of a contract by its name
     * @param contractName name of contract
     */
    getAddress(contractName: string): Promise<string>

    /**
     * Extract the ABI object of a contract by its name
     * @param contractName name of contract
     */
    getAbi(contractName: string): any

    /**
     * Returns the block on which the contract was deployed
     * @param contractName name of contract
     */
    getStartBlock(contractName: string): Promise<number | undefined>
}

/**
 * Resolve information from hardhat-deploy deployments API
 */
class DeploymentsResolver implements Resolver {
    private deployments: DeploymentsExtension

    constructor(deployments: DeploymentsExtension) {
        this.deployments = deployments
    }

    async getAddress(contractName: string): Promise<string> {
        if (contractName.startsWith("0x")) {
            return contractName
        }
        const deployment = await this.deployments.get(contractName)
        console.log(
            `${contractName} resolved to ${deployment.address} by DeploymentsResolver`
        )
        return deployment.address
    }

    async getAbi(contractName: string): Promise<any> {
        const deployment = await this.deployments.getOrNull(contractName)
        if (deployment) {
            return deployment.abi
        }
        const artifact = await this.deployments.getArtifact(contractName)
        if (artifact) {
            return artifact.abi
        }
        const extendedArtifact = await this.deployments.getExtendedArtifact(
            contractName
        )
        if (extendedArtifact) {
            extendedArtifact.abi
        }
        throw new Error(
            `DeploymentsResolver cannot resolve abi for contract ${contractName}`
        )
    }

    async getStartBlock(contractName: string): Promise<number | undefined> {
        const deployment = await this.deployments.get(contractName)
        const blockNumber = deployment.receipt?.blockNumber
        if (blockNumber) {
            console.log(
                `Block number of ${contractName} resolved to ${blockNumber} by DeploymentsResolver`
            )
        } else {
            console.log(`Block number undefined for contract ${contractName}`)
        }
        return hexToNumber(blockNumber)
    }
}

/**
 * Resolver from a specific deployment file
 */
class DeploymentResolver implements Resolver {
    private deployment: Deployment

    constructor(deployment: Deployment) {
        this.deployment = deployment
    }

    async getAddress(contractName: string): Promise<string> {
        if (contractName.startsWith("0x")) {
            return contractName
        }
        console.log(
            `${contractName} resolved to ${this.deployment.address} by DeploymentResolver`
        )
        return this.deployment.address
    }

    async getAbi(contractName: string): Promise<any> {
        return this.deployment.abi
    }

    async getStartBlock(contractName: string): Promise<number | undefined> {
        const blockNumber = this.deployment.receipt?.blockNumber
        if (blockNumber) {
            console.log(
                `Block number of ${contractName} resolved to ${blockNumber} by DeploymentResolver`
            )
        } else {
            console.log(`Block number undefined for contract ${contractName}`)
        }
        return hexToNumber(blockNumber)
    }
}

/**
 * Resolver from a deployment export file
 */
class ExportResolver implements Resolver {
    private exportFile: Export

    constructor(exportFile: Export) {
        this.exportFile = exportFile
    }

    async getAddress(contractName: string): Promise<string> {
        if (contractName.startsWith("0x")) {
            return contractName
        }
        const contract = this.exportFile.contracts[contractName]
        console.log(
            `${contractName} resolved to ${contract.address} by ExportResolver`
        )
        return contract.address
    }

    async getAbi(contractName: string): Promise<any> {
        const contract = this.exportFile.contracts[contractName]
        return contract.abi
    }

    async getStartBlock(_contractName: string): Promise<number | undefined> {
        console.log(`Block number undefined for contract ${_contractName}`)
        return undefined
    }
}

/**
 * Resolver from export artifact file
 */
class ExtendedArtifactResolver implements Resolver {
    private artifact: ExtendedArtifact
    constructor(artifact: ExtendedArtifact) {
        this.artifact = artifact
    }

    async getAddress(contractName: string): Promise<string> {
        throw new Error(
            `ExtendedArtifactResolver cannot resolve address for contract ${contractName}`
        )
    }

    async getAbi(_contractName: string): Promise<any> {
        return this.artifact.abi
    }

    async getStartBlock(contractName: string): Promise<number | undefined> {
        throw new Error(
            `ExtendedArtifactResolver cannot resolve start block for contract ${contractName}`
        )
    }
}

export interface SubgraphOptions {
    inputFile?: string
    outputFile?: string
    abiDir?: string
    exportFile?: string
}

const subgraph = async (
    hre: HardhatRuntimeEnvironment,
    options?: SubgraphOptions
) => {
    const { deployments } = hre
    const inputFile =
        options?.inputFile || (DEFAULT_OPTIONS.inputFile as string)
    const outputFile =
        options?.outputFile || (DEFAULT_OPTIONS.outputFile as string)
    const abiDir = options?.abiDir || (DEFAULT_OPTIONS.abiDir as string)
    const deploymentsResolver = new DeploymentsResolver(deployments)

    // load input yaml template file
    console.log(`Loading ${inputFile}`)
    const template = yaml.load(
        fs.readFileSync(inputFile, "utf-8")
    ) as SubgraphManifest

    if (template.dataSources) {
        for (const dataSource of template.dataSources) {
            // set network using buidler network name
            dataSource.network =
                hre.network.name == "bsc_testnet" ? "chapel" : hre.network.name

            if (dataSource.kind == "ethereum/contract") {
                // assume the `address` is the contract name
                let contractName = dataSource.source.address
                let resolver: Resolver = deploymentsResolver

                if (contractName.indexOf(":") >= 0) {
                    const components = contractName.split(":")
                    const exportFile = components[0]
                    contractName = components[1]
                    resolver = new ExportResolver(
                        JSON.parse(fs.readFileSync(exportFile).toString())
                    )
                } else if (contractName.endsWith(".json")) {
                    const deployment: Deployment = JSON.parse(
                        fs.readFileSync(contractName).toString()
                    )
                    resolver = new DeploymentResolver(deployment)
                }

                // and resolve the address using the buidler deployment
                dataSource.source.address = await resolver.getAddress(
                    contractName
                )

                // set start block as the contract deployment block
                dataSource.source.startBlock = await resolver.getStartBlock(
                    contractName
                )

                if (dataSource.mapping.abis) {
                    for (const abi of dataSource.mapping.abis) {
                        // extract ABI to dedicated file assuming name is the name of contract
                        const contractName = abi.name
                        const abiDefinition = await resolver.getAbi(
                            contractName
                        )
                        const dir = abi.file || abiDir
                        const filename = path.join(dir, `${contractName}.json`)
                        console.log(
                            `Extracting ABI of ${contractName} and writing to ${filename}`
                        )
                        const abiStr = JSON.stringify(abiDefinition, null, 1)
                        fs.mkdirSync(dir, { recursive: true }) // make sure output directoy exist
                        fs.writeFileSync(filename, abiStr)
                        abi.file = filename
                    }
                }
            }
        }
    }

    if (template.templates) {
        for (const dataSource of template.templates) {
            // set network using buidler network name
            dataSource.network =
                hre.network.name == "bsc_testnet" ? "chapel" : hre.network.name

            if (dataSource.kind == "ethereum/contract") {
                let resolver: Resolver = deploymentsResolver

                if (dataSource.mapping.abis) {
                    for (const abi of dataSource.mapping.abis) {
                        // extract ABI to dedicated file assuming name is the name of contract
                        const contractName = abi.name
                        const abiDefinition = await resolver.getAbi(
                            contractName
                        )
                        const dir = abi.file || abiDir
                        const filename = path.join(dir, `${contractName}.json`)
                        console.log(
                            `Extracting ABI of ${contractName} and writing to ${filename}`
                        )
                        const abiStr = JSON.stringify(abiDefinition, null, 1)
                        fs.mkdirSync(dir, { recursive: true }) // make sure output directoy exist
                        fs.writeFileSync(filename, abiStr)
                        abi.file = filename
                    }
                }
            }
        }
    }

    console.log(`Writing config to ${outputFile}`)
    fs.writeFileSync(outputFile, yaml.dump(template))
}

export interface ExportAbiOptions {
    contractName: string
    exportFile?: string
    abiDir?: string
}

const exportAbi = async (
    hre: HardhatRuntimeEnvironment,
    options: ExportAbiOptions
) => {
    const { deployments } = hre
    const contractName = options.contractName
    const abiDir = options?.abiDir || (DEFAULT_OPTIONS.abiDir as string)

    const resolver = options.exportFile
        ? new ExportResolver(
              JSON.parse(fs.readFileSync(options.exportFile).toString())
          )
        : new DeploymentsResolver(deployments)

    const abiDefinition = await resolver.getAbi(contractName)
    const filename = path.join(abiDir, `${contractName}.json`)
    console.log(`Extracting ABI of ${contractName} and writing to ${filename}`)
    const abiStr = JSON.stringify(abiDefinition, null, 1)

    fs.mkdirSync(abiDir, { recursive: true }) // make sure output directoy exist
    fs.writeFileSync(filename, abiStr)
}

// Task to generate thegraph subgraph definition
task("subgraph", "Generate thegraph config from a template")
    .addOptionalParam(
        "inputFile",
        "Template file path",
        DEFAULT_OPTIONS.inputFile,
        types.string
    )
    .addOptionalParam(
        "outputFile",
        "Output file to write to",
        DEFAULT_OPTIONS.outputFile,
        types.string
    )
    .addOptionalParam(
        "abiDir",
        "Directory to export required ABIs",
        DEFAULT_OPTIONS.abiDir,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        await subgraph(hre, taskArgs)
    })

task("export-abi", "Export ABI of contract")
    .addOptionalParam(
        "abiDir",
        "Directory to export required ABIs",
        DEFAULT_OPTIONS.abiDir,
        types.string
    )
    .addOptionalParam(
        "exportFile",
        "Deployment export file to read address and ABI from",
        undefined,
        types.string
    )
    .addPositionalParam("contractName", "Name of contract")
    .setAction(async (taskArgs, hre) => {
        await exportAbi(hre, taskArgs)
    })
