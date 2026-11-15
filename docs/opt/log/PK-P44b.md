# PK-P44b: Drag switches the scene and moves the pig
- Status: DONE
- Edge Hold: handleEdgeHold resolves neighbour with CuyScenes.neighbor(current, side). If locked/none, shows toast "Locked: <hint>" and stays in scene; otherwise calls applyScene(neighbourId) and CanvasPig.continueDrag(def).
- Pig Move on Drop: handleCanvasDrop sends places.pigMove {pigId, to: currentSceneId} once on release inside canvas. Pinned pigs stay pinned (pinned: true preserved).
- Edge Neighbours: CanvasPig.setEdgeNeighbours set on every scene change in applyScene.
- Cancel: drag released outside canvas triggers take_out and sends no places.pigMove.
- Differences from plan: None. All T1-T7 tests green.
