
const _prefix = 'diamond'
const _toolsPick:string = _prefix +'_pickaxe'
const _toolsAxe:string = _prefix +'_axe'
const _toolsShov:string = _prefix +'_shovel'

export const SETTINGS = {

  serverIP:  'localhost',
  serverPort: 59846, 
  tpa:false,

  botName: "not_a_bot",
  interfaceBotName: "interfaceBot",
  masterName: "userPlayerName",
  wandBlock: "Lightning Rod",
  toolsPick: _toolsPick,
  toolsShov: _toolsAxe,
  toolsAxe: _toolsShov,
  toolsFilter: [
    _toolsPick,
    _toolsAxe,
    _toolsShov
  ],
  collectActionThreashold: 100,
  minEmtpySlotsDuringWork: 2,
  errorRetries:3,
}


