import * as v from 'vec3'
import {Item} from 'prismarine-item'

export interface IIterator {
    // current position
    next:Function
}

export class SimpleIterator implements IIterator {
  private currX:number = 0
  private currY:number = 0
  private currZ:number = 0

  private xMin:number
  private xMax:number
  private zMin:number
  private zMax:number
  private yMin:number

  // all inputs are inclusive
  constructor(_xMin:number,_xMax:number,_zMin:number,_zMax:number,_yMin:number,_yMax:number = 320){
    this.xMin = _xMin
    this.xMax = _xMax
    this.zMin = _zMin
    this.zMax = _zMax
    this.yMin = _yMin

    this.currY = _yMax
    this.currX = this.xMax
    this.currZ = this.zMax
  }

  public next(): v.Vec3 | null {
    // x => z => y
    this.currX = this.currX + 1

    if(this.currX > this.xMax){
      this.currX = this.xMin
      this.currZ = this.currZ + 1

      if(this.currZ > this.zMax){
        this.currZ = this.zMin
        
        this.currY = this.currY - 1
        if(this.currY < this.yMin){
          return null
        }
      }
    }
    return v.default([this.currX,this.currY,this.currZ])
  }
  public now(): v.Vec3 {
    return v.default([this.currX,this.currY,this.currZ])
  }

}

export class ItemListFilterIterator implements IIterator {

  public itemList:Item[][]
  private itemFilter:string
  private listsIndex:number = 0
  private itemIndex:number = -1

  // all inputs are inclusive
  constructor(_itemList:Item[][], itemName:string){
    this.itemList = _itemList
    this.itemFilter = itemName
  }

  public next(): number {
    this.itemIndex++
    let found = false
    let currItem:Item

    while(!found){
      if(this.listsIndex >= this.itemList.length){
        // finished looping throug without finding next
        break;
      }
      if(this.itemIndex >= this.itemList[this.listsIndex].length){
        this.itemIndex = 0
        this.listsIndex++
      } else { 
        currItem = this.itemList[this.listsIndex][this.itemIndex]
        if(currItem.name == this.itemFilter){
          found = true
        } else {
          this.itemIndex++
        }
      }
    }

    if(found){
      return this.listsIndex
    } else {
      return -1
    }
  }
}

export const subdivideArea = function(_minCorner:v.Vec3,_maxCorner:v.Vec3,desiredAmount:number):[v.Vec3[],v.Vec3[]]{
  let n = Math.ceil(Math.sqrt(desiredAmount))
  const xMin = _minCorner.x
  const xMax = _maxCorner.x
  const zMin = _minCorner.z
  const zMax = _maxCorner.z
  const y = _maxCorner.y

  let xWidth = Math.floor((xMax - xMin) / n)
  let zWidth = Math.floor((zMax - zMin) / n)

  let minCorners:v.Vec3[] = []
  let maxCorners:v.Vec3[] = []

  let zSubMin = zMin
  for(let i = 0; i < n; i++){
    let xSubMin = xMin
    for(let j = 0; j < n; j++){
      minCorners.push(v.default([xSubMin,y,zSubMin]))
      let xSubMax 
      if(j == n - 1){
        xSubMax = xMax
      } else {
        xSubMax = xSubMin + xWidth - 1
      }
      let zSubMax
      if(i == n - 1){
        zSubMax = zMax
      } else {
        zSubMax = zSubMin + zWidth - 1
      }
      maxCorners.push(v.default([xSubMax, y, zSubMax]))
      xSubMin += xWidth
    }
    zSubMin += zWidth
  }

  return [minCorners,maxCorners]
}

export function getChunkFromPos(scalar:number){
  return Math.floor(scalar / 16)
}

export function posWithinXZ(position:v.Vec3, minCorner:v.Vec3 ,maxCorner:v.Vec3):boolean{
  if(position.x < minCorner.x){
    return false
  }
  if(position.z < minCorner.z){
    return false
  }
  if(position.x > maxCorner.x){
    return false
  }
  if(position.z > maxCorner.z){
    return false
  }
  return true
}

export async function sleep(time:number = 2000){
  await new Promise(r => setTimeout(r, time)); // sleep
}