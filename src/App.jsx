import React, { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function Cube({ position }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  )
}

function XRSession({ onHit }) {
  const { gl } = useThree()
  const ref = useRef({ xrHitTestSource: null, localSpace: null })

  useEffect(() => {
    if (!navigator.xr) return

    gl.xr.enabled = true
    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
      if (supported) {
        navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test', 'local-floor'],
        }).then((session) => {
          gl.xr.setSession(session)
          session.addEventListener('select', (event) => {
            // on tap/click we’ll use the last hit
            if (ref.current.lastHit) onHit(ref.current.lastHit)
          })

          const viewerSpacePromise = session.requestReferenceSpace('viewer')
          viewerSpacePromise.then((viewerSpace) => {
            session.requestHitTestSource({ space: viewerSpace }).then((source) => {
              ref.current.xrHitTestSource = source
            })
          })

          session.requestReferenceSpace('local-floor').then((localSpace) => {
            ref.current.localSpace = localSpace
          })
        })
      }
    })
  }, [gl, onHit])

  // update each frame
  useThree(({ gl }) => {
    gl.setAnimationLoop((time, frame) => {
      if (!frame || !ref.current.xrHitTestSource) return
      const hitTestResults = frame.getHitTestResults(ref.current.xrHitTestSource)
      if (hitTestResults.length) {
        const pose = hitTestResults[0].getPose(ref.current.localSpace)
        if (pose) {
          // store last hit position
          ref.current.lastHit = [
            pose.transform.position.x,
            pose.transform.position.y,
            pose.transform.position.z,
          ]
        }
      }
    })
  })

  return null
}

export default function App() {
  const [cubePos, setCubePos] = useState(null)

  return (
    <Canvas
      camera={{ fov: 70 }}
      onCreated={({ gl }) => {
        gl.xr.enabled = true
      }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[1, 2, 1]} />
      <XRSession onHit={(pos) => setCubePos(pos)} />
      {cubePos && <Cube position={cubePos} />}
    </Canvas>
  )
}
