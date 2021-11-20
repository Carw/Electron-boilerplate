// import { parse } from "querystring"

import { parse } from "querystring"

export function flattenMenuItems ( menu ) {
  const flattenItems = {}
  menu.items.forEach( item => {
    if ( item.id ) {
      flattenItems[ item.id ] = item
      if ( item.submenu ) {
        Object.assign( flattenItems, flattenMenuItems( item.submenu ) )
      }
    }
  } )
  return flattenItems
}

export function updateStates ( itemsById, visibleStates, enabledStates, checkedStates ) {
  if ( visibleStates ) {
    for ( const command in visibleStates ) {
      const item = itemsById[ command ]
      if ( item ) {
        item.visible = visibleStates[ command ]
      }
    }
  }
  if ( enabledStates ) {
    for ( const command in enabledStates ) {
      const item = itemsById[ command ]
      if ( item ) {
        item.enabled = enabledStates[ command ]
      }
    }
  }
  if ( checkedStates ) {
    for ( const id in checkedStates ) {
      const item = itemsById[ id ]
      if ( item ) {
        item.checked = checkedStates[ id ]
      }
    }
  }
}

export function translateTemplate ( template, keystrokesByCommand ) {
  console.log( "Template" )
  console.log( template, keystrokesByCommand )

  for ( const i in template ) {
    const item = template[ i ]
    if ( item.command ) {
      item.accelerator = acceleratorForCommand( item.command, keystrokesByCommand )
    }

    console.log( "Item" )
    console.log( item )

    item.click = () => {
      handleCommand( item )
    }

    if ( item.submenu ) {
      translateTemplate( item.submenu, keystrokesByCommand )
    }
  }
  return template
}

function acceleratorForCommand ( command, keystrokesByCommand ) {
  const keystroke = keystrokesByCommand[ command ]
  if ( keystroke ) {
    let modifiers = keystroke.split( /-(?=.)/ )
    const key = modifiers.pop().toUpperCase()
      .replace( "+", "Plus" )
      .replace( "MINUS", "-" )
    modifiers = modifiers.map( ( modifier ) => {
      if ( process.platform === "darwin" ) {
        return modifier.replace( /cmdctrl/ig, "Cmd" )
          .replace( /shift/ig, "Shift" )
          .replace( /cmd/ig, "Cmd" )
          .replace( /ctrl/ig, "Ctrl" )
          .replace( /alt/ig, "Alt" )
      } else {
        return modifier.replace( /cmdctrl/ig, "Ctrl" )
          .replace( /shift/ig, "Shift" )
          .replace( /ctrl/ig, "Ctrl" )
          .replace( /alt/ig, "Alt" )
      }
    } )
    const keys = modifiers.concat( [ key ] )
    return keys.join( "+" )
  }
  return null
}

export function handleCommand ( item ) {
  handleCommandBefore( item )

  const args = item[ "command-arg" ]
    ? [ item.command, item[ "command-arg" ] ]
    : [ item.command ]

  global.application.sendCommandToAll( ...args )

  handleCommandAfter( item )
}

function handleCommandBefore ( item ) {
  if ( !item[ "command-before" ] ) {
    return
  }
  const [ command, params ] = item[ "command-before" ].split( "?" )
  const args = parse( params )
  global.application.sendCommandToAll( command, args )
}

function handleCommandAfter ( item ) {
  if ( !item[ "command-after" ] ) {
    return
  }
  const [ command, params ] = item[ "command-after" ].split( "?" )
  const args = parse( params )
  global.application.sendCommandToAll( command, args )
}
