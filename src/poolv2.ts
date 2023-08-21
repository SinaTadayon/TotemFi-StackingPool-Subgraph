import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
    StakingPool,
    Stake,
    User,
    Withdraw,
    Unstake,
} from "../generated/schema"
import { StakingPool as StakingPoolContract } from "../generated/templates"
import { PoolCreated } from "../generated/StakingPoolFactoryV3/StakingPoolFactoryV3"
import {
    Stake as StakeEvent,
    Withdraw as WithdrawEvent,
    Unstake as UnstakeEvent,
    PoolMatured as PoolMaturedEvent,
    PoolLocked as PoolLockedEvent,
} from "../generated/templates/StakingPool/StakingPoolV4"
import * as summary from "./summary"

export function handlePoolCreation(event: PoolCreated): void {
    let pool = loadOrCreatePool(event.params.pool)

    // update pool
    pool.startDate = event.block.timestamp
    pool.lockTime = event.params.lockTime
    pool.maturityTime = event.params.maturityTime
    pool.sizeAllocation = event.params.sizeAllocation
    pool.stakeApr = event.params.stakeApr
    pool.prizeAmount = event.params.prizeAmount
    pool.usdPrizeAmount = event.params.usdPrizeAmount
    pool.stakingPoolTaxRate = event.params.stakingPoolTaxRate
    pool.minimumStakeAmount = event.params.minimumStakeAmount
    pool.poolType = event.params.poolType
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
        pool.poolType = ""
        pool.totalStakes = 0
        pool.totalStaked = BigInt.fromI32(0)
        pool.isLocked = false
        pool.isMatured = false
        pool.isDeleted = false
        pool.totalUnStakes = BigInt.fromI32(0)
        pool.totalUnStaked = BigInt.fromI32(0)
        pool.totalWithdraws = BigInt.fromI32(0)
        pool.totalWithdrawed = BigInt.fromI32(0)
        pool.totalWithdrawedBtc = BigInt.fromI32(0)
        pool.save()

        let s = summary.loadOrCreate()
        s.totalPools++
        s.save()
    } 
    pool.totalUnStaked = pool.totalUnStaked !== null ? pool.totalUnStaked : BigInt.fromI32(0)
    pool.totalUnStakes = pool.totalUnStakes !== null ? pool.totalUnStakes : BigInt.fromI32(0)
    pool.totalWithdraws = pool.totalWithdraws !== null ? pool.totalWithdraws : BigInt.fromI32(0)
    pool.totalWithdrawed = pool.totalWithdrawed !== null ? pool.totalWithdrawed : BigInt.fromI32(0)
    pool.totalWithdrawedBtc = pool.totalWithdrawedBtc !== null ? pool.totalWithdrawedBtc : BigInt.fromI32(0)
    return pool!
}

export function loadOrCreateUser(address: Address): User {
    let user = User.load(address.toHex())

    if (user == null) {
        user = new User(address.toHex())

        user.totalStaked = BigInt.fromI32(0)
    }

    return user!
}

export function handleStake(event: StakeEvent): void {
    // save user
    let user = loadOrCreateUser(event.params.user)
    user.totalStaked = user.totalStaked.plus(event.params.amount)
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
    pool.save()
}

export function handleWithdraw(event: WithdrawEvent): void {
    // save entity
    let entity = new Withdraw(event.transaction.hash.toHex())
    entity.pool = event.address.toHex()
    entity.user = event.params.user.toHex()
    entity.value = event.params.amount
    entity.timestamp = event.block.timestamp
    entity.save()


    let pool = loadOrCreatePool(event.address)
    pool.totalWithdraws = pool.totalWithdraws!.plus(BigInt.fromI32(1))
    pool.totalWithdrawed = pool.totalWithdrawed!.plus(event.params.amount) 
    pool.totalWithdrawedBtc = pool.totalWithdrawedBtc!.plus(event.params.btcAmount)
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
    user.totalStaked = user.totalStaked.minus(event.params.amount)
    user.save()

    let pool = loadOrCreatePool(event.address)
    pool.totalUnStakes = pool.totalUnStakes!.plus(BigInt.fromI32(1))
    pool.totalUnStaked = pool.totalUnStaked!.plus(event.params.amount)
    pool.save()
}

export function handlePoolMatured(event: PoolMaturedEvent): void {
    let pool = loadOrCreatePool(event.address)
    pool.isMatured = true
    pool.save()
}

export function handlePoolLocked(event: PoolLockedEvent): void {
    let pool = loadOrCreatePool(event.address)
    pool.isLocked = true
    pool.save()
}


export function handlePoolDeleted(event: PoolLockedEvent): void {
    let pool = loadOrCreatePool(event.address)
    pool.isDeleted = true
    pool.save()
}
