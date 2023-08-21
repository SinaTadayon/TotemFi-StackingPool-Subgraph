import { BigInt } from "@graphprotocol/graph-ts"
import { Summary } from "../generated/schema"

export function loadOrCreate(): Summary {
    let summary = Summary.load("1")

    if (summary == null) {
        summary = new Summary("1")
        summary.totalPools = 0
        summary.totalStaked = BigInt.fromI32(0)
        summary.save()
    }

    return summary!
}
