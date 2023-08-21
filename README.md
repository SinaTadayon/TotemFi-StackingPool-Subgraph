# Totem Subgraph

## Running Instructions

The first step is to run a local node, by following the instructions at the [docs](https://thegraph.com/docs/quick-start#local-development).
You can either run a node connected to a local ganache private network, or a node connected to a testnet (like ropsten) or mainnet.

The following commands illustrate the scenario to deploy a graph from information available at `goerli` testnet. So you also need to run the node connected to `goerli`.

Some of the steps require a [Infura](https://infura.io) application id to be specified as an environment variable called `PROJECT_ID`.

```
yarn
yarn prepare:goerli
yarn codegen subgraph.goerli.yaml
yarn build subgraph.goerli.yaml
yarn create-local
yarn deploy-local
```


# How to update contracts

* need to replace deployment/<network> folder with latest compiled/deployed version from contracts project
* replace abi/* with latest changes from contract
* run above scripts

# Run on the local env by Docker
To run the project on the local we suppose the latest version of contract 
has been deployed on the BSC TestNet and the latest ABIs are provided in the 
`contracts/deployments/bsc_testnet` folder. We also use the `subgraph.template.dev.yaml` 
as template for generating and building sub-graph, So the source addresses 
must be set correctly on it.

At this point the docker-compose uses 
a BSC TestNet node as a local node. Maybe in the future we use Ganache (or any other developing node) as 
a local node.

1. Create two folders for Ipfs and PostgreSql file system 
next to the `totem-subgraph` folder:
```shell
cd ..
mkdir totem-subgraph-ipfs
mkdir totem-subgraph-postgres
cd totem-subgraph/
```
2. Run the docker-compose local file:
```shell
docker-compose -f docker-compose-graph-localhost.yaml up -d
```
3. Install node_modules:
```shell
yarn
```

4. Now we can generate new sub-graph based on `subgraph.template.dev.yaml` template:
```shell
yarn prepare:bsc_testnet
yarn codegen subgraph.bsc_testnet.yaml
yarn build subgraph.bsc_testnet.yaml
```

5. Deploy generated sub-graph to the graph-node:
```shell
yarn create-local
yarn deploy:bsc_testnet
```

6. If everything goes well and the sub-graph 
   deployed you can access the GrappQl panel of 
   your sub-graph on this path by HTTPS & WS:
```shell
http://localhost:8000/subgraphs/name/totemfi/predictor/graphql
```



