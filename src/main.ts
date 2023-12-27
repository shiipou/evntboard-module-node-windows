import 'dotenv/config'
import {JSONRPCClient, JSONRPCServer, JSONRPCServerAndClient} from 'json-rpc-2.0'
import {v4 as uuid} from 'uuid'
import { WebSocket } from 'ws'
import robot from 'robotjs'
import { VRect, CaptureScreenshot } from "windows-ffi";
import Speaker from "speaker";

import {EVNTBOARD_HOST, MODULE_CODE, MODULE_NAME, MODULE_TOKEN} from './constant'

const main = async () => {

  if (!EVNTBOARD_HOST) {
    throw new Error("EVNTBOARD_HOST not set")
  }

  if (!MODULE_NAME) {
    throw new Error("MODULE_NAME not set")
  }

  if (!MODULE_TOKEN) {
    throw new Error("MODULE_TOKEN not set")
  }

  let ws: WebSocket

  const serverAndClient = new JSONRPCServerAndClient(
    new JSONRPCServer(),
    new JSONRPCClient((request) => {
      try {
        ws.send(JSON.stringify(request))
        return Promise.resolve()
      } catch (error) {
        return Promise.reject(error)
      }
    }, () => uuid())
  )

  ws = new WebSocket(EVNTBOARD_HOST)

  ws.onopen = async () => {
    const result = await serverAndClient.request('session.register', {
      code: MODULE_CODE,
      name: MODULE_NAME,
      token: MODULE_TOKEN
    })

    const speaker = new Speaker();

    serverAndClient.addMethod('getScreenSize', async () => {
      const screen = robot.getScreenSize()
      return screen
    })

    serverAndClient.addMethod('getMousePos', async () => {
      return robot.getMousePos()
    })

    serverAndClient.addMethod('getPixelColor', async ({ x, y }) => {
      robot.getPixelColor(x, y)
    })

    serverAndClient.addMethod('typeString', async ({ value }) => {
      robot.typeString(value)
    })

    serverAndClient.addMethod('typeStringDelayed', async ({ value, cpm }) => {
      robot.typeStringDelayed(value, cpm)
    })

    serverAndClient.addMethod('keyTap', async ({ key, modifier }) => {
      robot.keyTap(key, modifier)
    })

    serverAndClient.addMethod('keyToggle', async ({ key, down, modifier }) => {
      robot.keyToggle(key, down, modifier)
    })

    serverAndClient.addMethod('mouseClick', async ({ button, double }) => {
      robot.mouseClick(button, double)
    })

    serverAndClient.addMethod('mouseToggle', async ({ down, button }) => {
      robot.mouseToggle(down, button)
    })

    serverAndClient.addMethod('moveMouse', async ({ x, y }) => {
      robot.moveMouse(x, y)
    })

    serverAndClient.addMethod('moveMouseSmooth', async ({ x, y, speed }) => {
      robot.moveMouseSmooth(x, y, speed)
    })

    serverAndClient.addMethod('dragMouse', async ({ x, y }) => {
      robot.dragMouse(x, y)
    })

    serverAndClient.addMethod('scrollMouse', async ({ x, y }) => {
      robot.scrollMouse(x, y)
    })

    serverAndClient.addMethod('screenshot', async () => {
      const screenshot = CaptureScreenshot({
        rectToCapture: new VRect(0, 0, robot.getScreenSize().width, robot.getScreenSize().height),
      });
      return screenshot.buffer.toJSON()
    })

    serverAndClient.addMethod('playSound', async ({ chunk }) => {
      return new Promise((resolve, reject) => {
        const succeed = speaker.write(chunk, (error) => {
          reject(error)
        })
        if (succeed) {
          resolve(succeed)
        }
      })
    })

  }

  ws.onmessage = (event: { data: { toString: () => string } }) => {
    serverAndClient.receiveAndSend(JSON.parse(event.data.toString()))
  }

  ws.onclose = (event: { reason: any }) => {
    serverAndClient.rejectAllPendingRequests(`Connection is closed (${event.reason}).`)
  }

  ws.onerror = (event: any) => {
    console.error('error a', event)
  }
}

main()
  .catch((e) => {
    console.error(e)
  })
