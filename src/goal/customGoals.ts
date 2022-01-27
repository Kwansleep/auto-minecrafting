import mcPathsFinder from 'mineflayer-pathfinder'
import { Entity } from 'prismarine-entity'
import * as v from 'vec3'
const { goals } = mcPathsFinder

export class ReachEntity extends goals.Goal{

  private CHECK_INTERVAL:number = 5;

  public entity:Entity;
  public reach:number;
  public needCheck:number = 0;

  constructor (entity:Entity,reach:number) {
    super()
    this.entity = entity
    this.reach = reach
  }

  public heuristic(node: mcPathsFinder.Move): number {
    const dx = this.entity.position.x - node.x
    const dy = this.entity.position.y - node.y
    const dz = this.entity.position.z - node.z
    return distanceXZ(dx, dz) + Math.abs(dy)
  }
  public isEnd(node: mcPathsFinder.Move): boolean {    
    let distance2 = this.entity.position.distanceSquared(v.default([node.x,node.y,node.z]))
    let result = distance2 < this.reach * this.reach
    //console.log(result)
    return result
  }
  public hasChanged(): boolean {
    this.needCheck++
    //console.log(this.needCheck)
    if(this.needCheck > this.CHECK_INTERVAL){
      this.needCheck = 0
      return true
    } else {
      return false
    }
  }
}


// from mineflayer-pathfinder
function distanceXZ (dx:number, dz:number) {
  dx = Math.abs(dx)
  dz = Math.abs(dz)
  return Math.abs(dx - dz) + Math.min(dx, dz) * Math.SQRT2
}

