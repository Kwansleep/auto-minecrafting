import mineflayer from 'mineflayer'
import mcPathsFinder from 'mineflayer-pathfinder'
import minecraftData from "minecraft-data"
import {Window} from 'prismarine-windows'
import {Item} from 'prismarine-item'
import * as v from 'vec3'
import MinecraftData from 'minecraft-data'
import { ItemListFilterIterator } from './utils.js'

const { goals, Movements, pathfinder } = mcPathsFinder

export class ChestsManager{
  private chestPosList: v.Vec3[]

  constructor(_chestPosList:v.Vec3[]){
    this.chestPosList = _chestPosList
    
  }

  private async readAllChests(bot:mineflayer.Bot): Promise<Item[][]>{
    const mcData = minecraftData(bot.version)
    const movement = new Movements(bot, mcData)
    bot.pathfinder.setMovements(movement)

    let totalItemList:Item[][] = []

    for(let i = 0; i < this.chestPosList.length;i++){
      let chestToOpen = bot.blockAt(this.chestPosList[i])
      totalItemList.push([])

      if (!chestToOpen) continue
      

      let pos = chestToOpen.position 
      try {
        await bot.pathfinder.goto(new goals.GoalBreakBlock(pos.x,pos.y,pos.z,bot,{range:4}))
      } catch {
        console.log("goto had error in readAllChests")
        return totalItemList
      }
      let chest = await bot.openChest(chestToOpen)

      totalItemList[i].push(...(chest as unknown as Window).containerItems())

      chest.close()
    }

    return totalItemList
  }
  public async getItemCount(bot:mineflayer.Bot,itemName:string):Promise<number>{
    let mcData = MinecraftData(bot.version)
    if(!mcData.itemsByName[itemName]) {
      console.log("Item name invalid at getItemCount()")
      return 0
    }
    let itemID = mcData.itemsByName[itemName].id 
    let itemlists = await this.readAllChests(bot)
    let count = 0

    itemlists.forEach(itemlist => {
      itemlist.forEach(item => {
        if(item.type == itemID){
          count += item.count
        }
      });
    });

    return count
  }
  public async getItemsCount(bot:mineflayer.Bot,itemNames:string[]):Promise<number[]>{
    let mcData = MinecraftData(bot.version)
    let itemCounts:number[] = []
    let itemIDs:number[] = []

    itemNames.forEach(name => {
      itemCounts.push(0)
      if(!mcData.itemsByName[name]) {
        console.log("Item name invalid at getItemsCount()")
        itemIDs.push(-1)
      } else {
        itemIDs.push(mcData.itemsByName[name].id)
      }
    });

    let itemlists = await this.readAllChests(bot)

    itemlists.forEach(itemlist => {
      itemlist.forEach(item => {
        let idx = itemIDs.indexOf(item.type)
        if(idx >= 0){
          itemCounts[idx] += item.count
        }
      });
    });

    return itemCounts
  }
  private async getItems(bot:mineflayer.Bot,chestIndex:number,itemsToGet:Item[]|string[]|null): Promise<number> {
    let filter:string[] = []
    if(itemsToGet){
      if(typeof(itemsToGet) === typeof(filter)){
        filter = itemsToGet as string[]
      } else {
        (itemsToGet as Item[]).forEach(item => {
          filter.push(item.name)
        });
      }
    } else {
      return 0
    }

    const mcData = minecraftData(bot.version)
    const movement = new Movements(bot, mcData)
    bot.pathfinder.setMovements(movement)

    let pos = this.chestPosList[chestIndex]
    try {
      await bot.pathfinder.goto(new goals.GoalGetToBlock(pos.x,pos.y,pos.z))
    } catch {
      console.log("goto had error in getItem")
      return 0
    }


    let chestToOpen = bot.blockAt(pos)
    if(!chestToOpen){
      console.log("Chest Not found for unload")    
      return 0
    }

    let chestInstance = await bot.openChest(chestToOpen)
    let chestWindow = chestInstance as unknown as Window
    let count = 0
    
    for(let i = 0; i < filter.length; i++){
      let itemName = filter[i]
      if(mcData.itemsByName[itemName]){
        try{
          await chestInstance.withdraw(mcData.itemsByName[itemName].id,null,1)
          /*
          let retrivedItem = bot.inventory.findInventoryItem(mcData.itemsByName[itemName].id,null,false)
          if(retrivedItem){
            await bot.equip(retrivedItem,'hand')
          }*/
          count++
        } catch {
          console.log("Error getting Items["+ itemName +"] in getItems")
        }
      }
    }
    chestInstance.close()
    return count
  }
  public async distributeItemsOnce(bots:mineflayer.Bot[],itemsToGet:string[]){
    if(bots.length < 1){
      return
    }
    let itemList = await this.readAllChests(bots[0])
    console.log("read all distribute chest")

    let itemIterators:ItemListFilterIterator[] = []
    itemsToGet.forEach(itemName => {
      itemIterators.push(new ItemListFilterIterator(itemList,itemName))
    });
    
    for(let i = 0; i < bots.length; i++){
      for(let j = 0; j < itemsToGet.length; j++){
        let chestIndex = itemIterators[j].next()
        if(chestIndex >= 0){
          await this.getItems(bots[i],chestIndex,[itemsToGet[j]])
        } else {
          console.log("Not enough Items to distribute in distributeItemOnce()")
        }
      }
    }
    
  }
  public async depositAll(bot:mineflayer.Bot,whitelist:string[] = []):Promise<boolean>{
    
    let chestIndex = 0;

    let depositSuccess = false

    while(!depositSuccess && chestIndex < this.chestPosList.length){
      depositSuccess = true
      let chestPos = this.chestPosList[chestIndex]
      depositSuccess = await unload(bot,chestPos,whitelist)

      if(depositSuccess){
        let currentBotItems = bot.inventory.slots
        currentBotItems.forEach(item => {
          if(!item){
            return
          }
          let index = whitelist.indexOf(item.name)
          if(index < 0){
            depositSuccess = false
          }
        });
      }

      console.log(depositSuccess)
      chestIndex++
    }
    console.log("depositeAll: " + depositSuccess)
    return depositSuccess
  }
}

export const unload = async function(bot:mineflayer.Bot, destination:v.Vec3, whitelist:Item[]|string[]|null,chestType:string = 'chest'): Promise<boolean>{
  let filter:string[] = []
  if(whitelist){
    if(typeof(whitelist) === typeof(filter)){
      filter = whitelist as string[]
    } else {
      (whitelist as Item[]).forEach(item => {
        filter.push(item.name)
      });
    }
  }
  //console.log(filter)

  const mcData = minecraftData(bot.version)
  const movement = new Movements(bot, mcData)
  bot.pathfinder.setMovements(movement)

  try{
    await bot.pathfinder.goto(new goals.GoalGetToBlock(destination.x,destination.y,destination.z))
  } catch {
    console.log("goto had error in unload")
  }

/*
  let chestToOpen = bot.findBlock({
    matching: mcData.blocksByName[chestType].id ,
    maxDistance: 6,
  })*/
  let chestToOpen = bot.blockAt(destination)
  if(!chestToOpen){
    console.log("Chest Not found for unload")    
    return false
  }

  let chestInstance = await bot.openChest(chestToOpen)
  let chestWindow = chestInstance as unknown as Window
  let botItems = chestWindow.items()
  let success:boolean = true
  for(let i = 0; i < botItems.length; i++){
    let item = botItems[i]
    if(!item){
      console.log("invalid item during chest load")
      continue
    }

    if(!(filter.includes(item.name))){
      try{
        await chestInstance.deposit(item.type,null,item.count)
      } catch (err){
        console.log(`unable to deposit ${item.count} ${item.name}`)
        success = false
      }
    }
  }

  chestInstance.close()

  return success
}
export const readChest = async function(bot:mineflayer.Bot, destination:v.Vec3, chestType:string = 'chest'):Promise<Item[]>{
  const mcData = minecraftData(bot.version)
  const movement = new Movements(bot, mcData)
  bot.pathfinder.setMovements(movement)
  
  try {
    await bot.pathfinder.goto(new goals.GoalGetToBlock(destination.x,destination.y,destination.z))
  } catch {
    console.log("goto had error in readChest")
  }


  let chestToOpen = bot.blockAt(destination)
  if(!chestToOpen){
    console.log("Chest Not found for unload")    
    return []
  }

  let chestInstance = await bot.openChest(chestToOpen)
  let chestWindow = chestInstance as unknown as Window
  let itemList = chestWindow.containerItems()
  chestInstance.close()

  return itemList
}


export const readChests = async function(bot:mineflayer.Bot){
  const mcData = minecraftData(bot.version)

  let chestsToOpen = bot.findBlocks({
    matching: mcData.blocksByName['chest'].id ,
    maxDistance: 6,
    count:10
  })

  if(!chestsToOpen){
    console.log("Chests Not found")    
    return
  }

  let totalItemList:Item[] = []
  for(let i = 0; i < chestsToOpen.length;i++){
    let chestToOpen = bot.blockAt(chestsToOpen[i])
    if (!chestToOpen) return

    let chest = await bot.openChest(chestToOpen)

    totalItemList.push(...(chest as unknown as Window).containerItems())
  
    chest.on('close',()=>{
      console.log("chest closed")
    })
  
    console.log("Checked a Chest")
    chest.close()
  }

  console.log(totalItemList)
}