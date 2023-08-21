import { Address, bigInt, BigInt } from "@graphprotocol/graph-ts"
import {
    StakingPool,
    Stake,
    User,
    Withdraw,
    Unstake,
} from "../generated/schema"
import { StakingPoolV6 as StakingPoolContract } from "../generated/templates"
import { PoolCreated } from "../generated/StakingPoolFactoryV6/StakingPoolFactoryV6"
import {
    Stake as StakeEvent,
    WithdrawStakingReturn as WithdrawEventReturn,
    WithdrawTotemPrize as WithdrawEventTotmPrize,
    WithdrawWrappedTokenPrize as WithdrawEventToken,
    Unstake as UnstakeEvent,
    PoolMatured as PoolMaturedEvent,
    PoolLocked as PoolLockedEvent,
} from "../generated/templates/StakingPoolV6/StakingPoolV6"
import * as summary from "./summary"

export function handlePoolCreation(event: PoolCreated): void {
    let pool = loadOrCreatePool(event.params.pool)
    // uint256 launchDate,
    // uint256 maturityTime,
    // uint256 lockTime,
    // uint256 sizeAllocation,
    // uint256 stakeApr,
    // uint256 prizeAmount,
    // uint256 usdPrizeAmount,
    // uint256 potentialCollabReward,
    // uint256 collaborativeRange,
    // uint256 burnRate,
    // uint256 minimumStakeAmount,
    // update pool
    pool.startDate = event.block.timestamp
    pool.variables = event.params.variables
    pool.minimumStakeAmount = pool.variables![10] as BigInt
    pool.stakingPoolTaxRate = pool.variables![9] as BigInt
    pool.burnRate = pool.stakingPoolTaxRate as BigInt
    pool.collaborativeRange = pool.variables![8] as BigInt
    pool.potentialCollabReward = pool.variables![7] as BigInt
    pool.usdPrizeAmount = pool.variables![6] as BigInt
    pool.prizeAmount = pool.variables![5] as BigInt
    pool.stakeApr = pool.variables![4] as BigInt
    pool.sizeAllocation = pool.variables![3] as BigInt
    pool.lockTime = pool.variables![2] as BigInt
    pool.maturityTime = pool.variables![1] as BigInt
    pool.launchDate = pool.variables![0] as BigInt
    pool.poolType = event.params.poolType
    pool.ranks = event.params.ranks
    pool.percentages = event.params.percentages
    pool.isEnhancedEnabled = event.params.isEnhancedEnabled
    pool.wrappedTokenSymbol = event.params.wrappedTokenSymbol
    pool.timestamp =event.block.timestamp
    pool.save()

    StakingPoolContract.create(event.params.pool)
}

export function loadOrCreatePool(address: Address): StakingPool {
    let pool = StakingPool.load(address.toHex())

    if (pool == null) {
        pool = new StakingPool(address.toHex())

        pool.startDate = BigInt.fromI32(0)
        pool.lockTime = BigInt.fromI32(0)
        pool.maturityTime = BigInt.fromI32(0)
        pool.sizeAllocation = BigInt.fromI32(0)
        pool.stakeApr = BigInt.fromI32(0)
        pool.prizeAmount = BigInt.fromI32(0)
        pool.usdPrizeAmount = BigInt.fromI32(0)
        pool.stakingPoolTaxRate = BigInt.fromI32(0)
        pool.burnRate = pool.stakingPoolTaxRate as BigInt
        pool.poolType = ""
        pool.variables = []
        pool.ranks = []
        pool.percentages = []
        pool.isEnhancedEnabled = false
        pool.totalStakes = 0
        pool.totalStaked = BigInt.fromI32(0)
        pool.isLocked = false
        pool.isMatured = false
        pool.totalUnStakes = BigInt.fromI32(0)
        pool.totalUnStaked = BigInt.fromI32(0)
        pool.totalWithdraws = BigInt.fromI32(0)
        pool.totalWithdrawed = BigInt.fromI32(0)
        pool.totalWithdrawedToken = BigInt.fromI32(0)
        pool.wrappedTokenSymbol = ""
        pool.totalWithdrawedReward = BigInt.fromI32(0)
        pool.totalWithdrawedToken = BigInt.fromI32(0)
        pool.totalWithdrawsToken = BigInt.fromI32(0)
        pool.totalWithdrawsReward = BigInt.fromI32(0)
        pool.isActive = false
        pool.save()

        let s = summary.loadOrCreate()
        s.totalPools++
        s.save()
    }
    pool.totalUnStaked = pool.totalUnStaked !== null ? pool.totalUnStaked : BigInt.fromI32(0)
    pool.totalUnStakes = pool.totalUnStakes !== null ? pool.totalUnStakes : BigInt.fromI32(0)
    pool.totalWithdraws = pool.totalWithdraws !== null ? pool.totalWithdraws : BigInt.fromI32(0)
    pool.totalWithdrawed = pool.totalWithdrawed !== null ? pool.totalWithdrawed : BigInt.fromI32(0)
    pool.totalWithdrawedToken = pool.totalWithdrawedToken !== null ? pool.totalWithdrawedToken : BigInt.fromI32(0)
    return pool!
}

export function loadOrCreateUser(address: Address): User {
    let user = User.load(address.toHex())

    if (user == null) {
        user = new User(address.toHex())
        user.totalStaked = BigInt.fromI32(0)
        user.totalStakes = BigInt.fromI32(0)
        user.totalUnStakes = BigInt.fromI32(0)
        user.totalUnStaked = BigInt.fromI32(0)
        user.totalERC20Reward = BigInt.fromI32(0)
        user.totalStakingReward = BigInt.fromI32(0)
        user.totalTotmReward = BigInt.fromI32(0)
    }

    return user!
}

export function handleStake(event: StakeEvent): void {
    // save user
    let user = loadOrCreateUser(event.params.user)
    user.totalStaked = user.totalStaked.plus(event.params.amount)
    user.totalStakes = user.totalStakes.plus(BigInt.fromI32(1))
    user.timestamp = event.block.timestamp
    user.save()

    // save entity
    let entity = new Stake(event.transaction.hash.toHex())
    entity.pool = event.address.toHex()
    entity.user = event.params.user.toHex()
    entity.value = event.params.amount
    entity.pricePrediction = event.params.pricePrediction
    entity.timestamp = event.block.timestamp
    entity.save()

    let pool = loadOrCreatePool(event.address)
    pool.totalStakes++
    pool.totalStaked = pool.totalStaked.plus(event.params.amount)
    pool.timestamp =event.block.timestamp
    pool.save()
}

export function handleUnstake(event: UnstakeEvent): void {
    // save entity
    let entity = new Unstake(event.transaction.hash.toHex())
    entity.pool = event.address.toHex()
    entity.user = event.params.user.toHex()
    entity.value = event.params.amount
    entity.timestamp = event.block.timestamp
    entity.save()

    // save user
    let user = loadOrCreateUser(event.params.user)
    user.totalUnStaked = user.totalUnStaked.plus(event.params.amount)
    user.totalUnStakes = user.totalUnStakes.plus(BigInt.fromI32(1))
    user.timestamp = event.block.timestamp
    user.save()

    let pool = loadOrCreatePool(event.address)
    pool.totalUnStakes = pool.totalUnStakes!.plus(BigInt.fromI32(1))
    pool.totalUnStaked = pool.totalUnStaked!.plus(event.params.amount)
    pool.timestamp = event.block.timestamp
    pool.save()
}
export function handleWithdrawWrappedTokenPrize(event: WithdrawEventToken): void {
    // save entity
    let entity = new Withdraw(event.transaction.hash.toHex())
    entity.pool = event.address.toHex()
    entity.user = event.params.user.toHex()
    entity.tokenReward = event.params.wrappedTokenPrize
    entity.timestamp = event.block.timestamp
    entity.save()


    // save user
    let user = loadOrCreateUser(event.params.user)
    user.totalERC20Reward = user.totalERC20Reward.plus(event.params.wrappedTokenPrize)
    user.timestamp = event.block.timestamp
    user.save()

    let pool = loadOrCreatePool(event.address)
    pool.totalWithdrawedToken = pool.totalWithdrawedToken!.plus(event.params.wrappedTokenPrize)
    pool.timestamp = event.block.timestamp
    pool.save()

}
export function handleWithdrawTotemPrize(event: WithdrawEventTotmPrize): void {
    // save entity
    let entity = new Withdraw(event.transaction.hash.toHex())
    entity.pool = event.address.toHex()
    entity.user = event.params.user.toHex()
    entity.totmPrize = event.params.totemPrize
    entity.timestamp = event.block.timestamp
    entity.save()

    // save user
    let user = loadOrCreateUser(event.params.user)
    user.totalTotmReward = user.totalTotmReward.plus(event.params.totemPrize)
    user.timestamp = event.block.timestamp
    user.save()

    let pool = loadOrCreatePool(event.address)
    pool.totalWithdraws = pool.totalWithdraws!.plus(BigInt.fromI32(1))
    pool.totalWithdrawed = pool.totalWithdrawed!.plus(event.params.totemPrize)
    pool.timestamp = event.block.timestamp
    pool.save()

}
export function handleWithdrawStakingReturn(event: WithdrawEventReturn): void {
    // save entity
    let entity = new Withdraw(event.transaction.hash.toHex())
    entity.pool = event.address.toHex()
    entity.user = event.params.user.toHex()
    entity.stakingReward = event.params.stakingReturn
    entity.timestamp = event.block.timestamp
    entity.save()

    // save user
    let user = loadOrCreateUser(event.params.user)
    user.totalStakingReward = user.totalStakingReward.plus(event.params.stakingReturn)
    user.timestamp = event.block.timestamp
    user.save()

    let pool = loadOrCreatePool(event.address)
    pool.totalWithdrawsReward = pool.totalWithdrawsReward!.plus(BigInt.fromI32(1))
    pool.totalWithdrawedReward = pool.totalWithdrawedReward!.plus(event.params.stakingReturn)
    pool.timestamp = event.block.timestamp
    pool.save()

}


export function handlePoolMatured(event: PoolMaturedEvent): void {
    let pool = loadOrCreatePool(event.address)
    pool.isMatured = true
    pool.timestamp = event.block.timestamp
    pool.save()
}

export function handlePoolLocked(event: PoolLockedEvent): void {
    let pool = loadOrCreatePool(event.address)
    pool.isLocked = true
    pool.timestamp = event.block.timestamp
    pool.save()
}


export function handlePoolActivated(event: PoolLockedEvent): void {
    let pool = loadOrCreatePool(event.address)
    pool.isActive = true
    pool.timestamp = event.block.timestamp
    pool.save()
}

export function handlePoolDeactivated(event: PoolLockedEvent): void {
    let pool = loadOrCreatePool(event.address)
    pool.isActive = false
    pool.timestamp = event.block.timestamp
    pool.save()
}
