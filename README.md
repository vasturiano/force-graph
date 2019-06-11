# force-graph

Force-directed graph rendered on HTML5 canvas.

[![NPM](https://nodei.co/npm/force-graph.png?compact=true)](https://nodei.co/npm/force-graph/)

<p align="center">
     <a href="https://vasturiano.github.io/force-graph/example/medium-graph"><img width="80%" src="https://vasturiano.github.io/force-graph/example/medium-graph/preview.png"></a>
</p>

A web component to represent a graph data structure in a 2-dimensional canvas using a force-directed iterative layout.
Uses HTML5 canvas for rendering and [d3-force](https://github.com/d3/d3-force) for the underlying physics engine.
Supports canvas zooming/panning, node dragging and node/link hover/click interactions.

Check out the examples:
* [Basic](https://vasturiano.github.io/force-graph/example/basic/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/basic/index.html))
* [Load JSON](https://vasturiano.github.io/force-graph/example/load-json/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/load-json/index.html))
* [Medium size graph (~4k elements)](https://vasturiano.github.io/force-graph/example/medium-graph/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/medium-graph/index.html))
* [Large size graph (~75k elements)](https://vasturiano.github.io/force-graph/example/large-graph/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/large-graph/index.html))
* [Text as nodes](https://vasturiano.github.io/force-graph/example/text-nodes/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/text-nodes/index.html))
* [Images as nodes](https://vasturiano.github.io/force-graph/example/img-nodes/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/img-nodes/index.html))
* [Directional links (using arrows)](https://vasturiano.github.io/force-graph/example/directional-links-arrows/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/directional-links-arrows/index.html))
* [Directional links (using moving particles)](https://vasturiano.github.io/force-graph/example/directional-links-particles/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/directional-links-particles/index.html))
* [Curved lines and self links](https://vasturiano.github.io/force-graph/example/curved-links/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/curved-links/index.html))
* [Text in links](https://vasturiano.github.io/force-graph/example/text-links/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/text-links/index.html))
* [Dash odd links](https://vasturiano.github.io/force-graph/example/dash-odd-links/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/dash-odd-links/index.html))
* [Highlight nodes/links](https://vasturiano.github.io/force-graph/example/highlight/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/highlight/index.html))
* [Auto-colored nodes/links](https://vasturiano.github.io/force-graph/example/auto-colored/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/auto-colored/index.html))
* [Custom node shapes](https://vasturiano.github.io/force-graph/example/custom-node-shape/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/custom-node-shape/index.html))
* [Zoom/pan viewport](https://vasturiano.github.io/force-graph/example/move-viewport/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/move-viewport/index.html))
* [Click to focus on node](https://vasturiano.github.io/force-graph/example/click-to-focus/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/click-to-focus/index.html))
* [Dynamic data changes](https://vasturiano.github.io/force-graph/example/dynamic/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/dynamic/index.html))
* [Node collision detection](https://vasturiano.github.io/force-graph/example/collision-detection/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/collision-detection/index.html))
* [Force-directed tree (DAG mode)](https://vasturiano.github.io/force-graph/example/tree/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/tree/index.html))
* [yarn.lock dependency graph (DAG mode)](https://vasturiano.github.io/force-graph/example/dag-yarn/) ([source](https://github.com/vasturiano/force-graph/blob/master/example/dag-yarn/index.html))

See also the [3D version](https://github.com/vasturiano/3d-force-graph).

And check out the [React bindings](https://github.com/vasturiano/react-force-graph).

## Quick start

```
import ForceGraph from 'force-graph';
```
or
```
var ForceGraph = require('force-graph');
```
or even
```
<script src="//unpkg.com/force-graph"></script>
```
then
```
var myGraph = ForceGraph();
myGraph(<myDOMElement>)
    .graphData(<myData>);
```

## API reference

### Data input

| Method | Description | Default |
| --- | --- | :--: |
| <b>graphData</b>([<i>data</i>]) | Getter/setter for graph data structure (see below for syntax details). Can also be used to apply [incremental updates](https://vasturiano.github.io/force-graph/example/dynamic/). | `{ nodes: [], links: [] }` |
| <b>nodeId</b>([<i>str</i>]) | Node object accessor attribute for unique node id (used in link objects source/target). | `id` |
| <b>linkSource</b>([<i>str</i>]) | Link object accessor attribute referring to id of source node. | `source` |
| <b>linkTarget</b>([<i>str</i>]) | Link object accessor attribute referring to id of target node. | `target` |

### Container layout

| Method | Description | Default |
| --- | --- | :--: |
| <b>width</b>([<i>px</i>]) | Getter/setter for the canvas width. | *&lt;window width&gt;* |
| <b>height</b>([<i>px</i>]) | Getter/setter for the canvas height. | *&lt;window height&gt;* |
| <b>backgroundColor</b>([<i>str</i>]) | Getter/setter for the chart background color. | *&lt;transparent&gt;* |

### Node styling

| Method | Description | Default |
| --- | --- | :--: |
| <b>nodeRelSize</b>([<i>num</i> or <i>fn</i>]) | Node object accessor function or attribute for node size. Affects the ratio of node circle area (square px) per value unit. | 4 |
| <b>nodeVal</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Node object accessor function, attribute or a numeric constant for the node numeric value (affects circle area). | `val` |
| <b>nodeLabel</b>([<i>str</i> or <i>fn</i>]) | Node object accessor function or attribute for name (shown in label). Supports plain text or HTML content. Note that this method uses `innerHTML` internally, so make sure to pre-sanitize any user-input content to prevent XSS vulnerabilities. | `name` |
| <b>nodeColor</b>([<i>str</i> or <i>fn</i>]) | Node object accessor function or attribute for node color (affects circle color). | `color` |
| <b>nodeAutoColorBy</b>([<i>str</i> or <i>fn</i>]) | Node object accessor function (`fn(node)`) or attribute (e.g. `'type'`) to automatically group colors by. Only affects nodes without a color attribute. | |
| <b>nodeCanvasObject</b>([<i>fn</i>]) | Callback function for painting a custom canvas object to represent graph nodes. Should use the provided canvas context attribute to perform drawing operations for each node. The callback function will be called for each node at every frame, and has the signature: `.nodeCanvasObject(<node>, <canvas context>, <current global scale>)`.  | *default node object is a circle, sized according to `val` and styled according to `color`.* |
| <b>nodeCanvasObjectMode</b>([<i>str</i> or <i>fn</i>]) | Node object accessor function or attribute for the custom drawing mode. Use in combination with `nodeCanvasObject` to specify how to customize nodes painting. Possible values are: <ul><li>`replace`: the node is rendered using just `nodeCanvasObject`.</li><li>`before`: the node is rendered by invoking `nodeCanvasObject` and then proceeding with the default node painting.</li><li>`after`: `nodeCanvasObject` is applied after the default node painting takes place.</li></ul>Any other value will be ignored and the default drawing will be applied. | `() => 'replace'` |

### Link styling

| Method | Description | Default |
| --- | --- | :--: |
| <b>linkLabel</b>([<i>str</i> or <i>fn</i>]) | Link object accessor function or attribute for name (shown in label). Supports plain text or HTML content. Note that this method uses `innerHTML` internally, so make sure to pre-sanitize any user-input content to prevent XSS vulnerabilities. | `name` |
| <b>linkVisibility</b>([<i>boolean</i>, <i>str</i> or <i>fn</i>]) | Link object accessor function, attribute or a boolean constant for whether to display the link line. A value of `false` maintains the link force without rendering it. | `true` |
| <b>linkColor</b>([<i>str</i> or <i>fn</i>]) | Link object accessor function or attribute for line color. | `color` |
| <b>linkAutoColorBy</b>([<i>str</i> or <i>fn</i>]) | Link object accessor function (`fn(link)`) or attribute (e.g. `'type'`) to automatically group colors by. Only affects links without a color attribute. | |
| <b>linkWidth</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Link object accessor function, attribute or a numeric constant for the link line width. Keep in mind that link widths remain visually contant through various zoom levels, where as node sizes scale relatively. | 1 |
| <b>linkCurvature</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Link object accessor function, attribute or a numeric constant for the curvature radius of the link line. Curved lines are represented as bezier curves, and any numeric value is accepted. A value of `0` renders a straight line. `1` indicates a radius equal to half of the line length, causing the curve to approximate a semi-circle. For self-referencing links (`source` equal to `target`) the curve is represented as a loop around the node, with length proportional to the curvature value. Lines are curved clockwise for positive values, and counter-clockwise for negative values. Note that rendering curved lines is purely a visual effect and does not affect the behavior of the underlying forces. | 0 |
| <b>linkCanvasObject</b>([<i>fn</i>]) | Callback function for painting a custom canvas object to represent graph links. Should use the provided canvas context attribute to perform drawing operations for each link. The callback function will be called for each link at every frame, and has the signature: `.linkCanvasObject(<link>, <canvas context>, <current global scale>)`.  | *default link object is a line, styled according to `width` and `color`.* |
| <b>linkCanvasObjectMode</b>([<i>str</i> or <i>fn</i>]) | Link object accessor function or attribute for the custom drawing mode. Use in combination with `linkCanvasObject` to specify how to customize links painting. Possible values are: <ul><li>`replace`: the link is rendered using just `linkCanvasObject`.</li><li>`before`: the link is rendered by invoking `linkCanvasObject` and then proceeding with the default link painting.</li><li>`after`: `linkCanvasObject` is applied after the default link painting takes place.</li></ul>Any other value will be ignored and the default drawing will be applied. | `() => 'replace'` |
| <b>linkDirectionalArrowLength</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Link object accessor function, attribute or a numeric constant for the length (in `px`) of the arrow head indicating the link directionality. The arrow is displayed directly over the link line, and points in the direction of `source` > `target`. A value of `0` hides the arrow. | 0 |
| <b>linkDirectionalArrowColor</b>([<i>str</i> or <i>fn</i>]) | Link object accessor function or attribute for the color of the arrow head. | `color` |
| <b>linkDirectionalArrowRelPos</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Link object accessor function, attribute or a numeric constant for the longitudinal position of the arrow head along the link line, expressed as a ratio between `0` and `1`, where `0` indicates immediately next to the `source` node, `1` next to the `target` node, and `0.5` right in the middle. | 0.5 |
| <b>linkDirectionalParticles</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Link object accessor function, attribute or a numeric constant for the number of particles (small circles) to display over the link line. The particles are distributed equi-spaced along the line, travel in the direction `source` > `target`, and can be used to indicate link directionality. | 0 |
| <b>linkDirectionalParticleSpeed</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Link object accessor function, attribute or a numeric constant for the directional particles speed, expressed as the ratio of the link length to travel per frame. Values above `0.5` are discouraged. | 0.01 |
| <b>linkDirectionalParticleWidth</b>([<i>num</i>, <i>str</i> or <i>fn</i>]) | Link object accessor function, attribute or a numeric constant for the directional particles width (diameter). | 4 |
| <b>linkDirectionalParticleColor</b>([<i>str</i> or <i>fn</i>]) | Link object accessor function or attribute for the directional particles color. | `color` |

### Render control

| Method | Description | Default |
| --- | --- | :--: |
| <b>pauseAnimation</b>() <br/><sub>(alias: <i>stopAnimation</i>)</sub> | Pauses the rendering cycle of the component, effectively freezing the current view and cancelling all user interaction. This method can be used to save performance in circumstances when a static image is sufficient. | |
| <b>resumeAnimation</b>() | Resumes the rendering cycle of the component, and re-enables the user interaction. This method can be used together with `pauseAnimation` for performance optimization purposes. | |
| <b>centerAt</b>([<i>x</i>], [<i>y</i>], [<i>ms</i>]) | Getter/setter for the coordinates of the center of the viewport. This method can be used to perform panning on the canvas programmatically. Each of the `x, y` coordinates is optional, allowing for motion in just one dimension. An optional 3rd argument defines the duration of the transition (in ms) to animate the canvas motion. A value of 0 (default) centers immediately in the final position. | 0,0 |
| <b>zoom</b>([<i>num</i>], [<i>ms</i>]) | Getter/setter for the canvas zoom amount. The zoom is defined in terms of the scale transform of each px. A value of `1` indicates unity, larger values zoom in and smaller values zoom out. An optional 2nd argument defines the duration of the transition (in ms) to animate the canvas motion. A value of 0 (default) jumps immediately to the final position. | By default the zoom is set to a value inversely proportional to the amount of nodes in the system. |
| <b>refresh</b>() | Redraws all the nodes/links and reheats the force simulation engine. |

### Force engine (d3-force) configuration

| Method | Description | Default |
| --- | --- | :--: |
| <b>dagMode</b>([<i>str</i>]) | Apply layout constraints based on the graph directionality. Only works for [DAG](https://en.wikipedia.org/wiki/Directed_acyclic_graph) graph structures (without cycles). Choice between `td` (top-down), `bu` (bottom-up), `lr` (left-to-right), `rl` (right-to-left), `radialout` (outwards-radially) or `radialin` (inwards-radially). | |
| <b>dagLevelDistance</b>([<i>num</i>]) | If `dagMode` is engaged, this specifies the distance between the different graph depths. | *auto-derived from the number of nodes* |
| <b>d3AlphaDecay</b>([<i>num</i>]) | Getter/setter for the [simulation intensity decay](https://github.com/d3/d3-force#simulation_alphaDecay) parameter. | `0.0228` |
| <b>d3VelocityDecay</b>([<i>num</i>]) | Getter/setter for the nodes' [velocity decay](https://github.com/d3/d3-force#simulation_velocityDecay) that simulates the medium resistance. | `0.4` |
| <b>d3Force</b>(<i>str</i>, [<i>fn</i>]) | Getter/setter for the internal forces that control the d3 simulation engine. Follows the same interface as `d3-force`'s [simulation.force](https://github.com/d3/d3-force#simulation_force). Three forces are included by default: `'link'` (based on [forceLink](https://github.com/d3/d3-force#forceLink)), `'charge'` (based on [forceManyBody](https://github.com/d3/d3-force#forceManyBody)) and `'center'` (based on [forceCenter](https://github.com/d3/d3-force#forceCenter)). Each of these forces can be reconfigured, or new forces can be added to the system. | |
| <b>warmupTicks</b>([<i>int</i>]) | Getter/setter for number of layout engine cycles to dry-run at ignition before starting to render. | 0 |
| <b>cooldownTicks</b>([<i>int</i>]) | Getter/setter for how many build-in frames to render before stopping and freezing the layout engine. | Infinity |
| <b>cooldownTime</b>([<i>num</i>]) | Getter/setter for how long (ms) to render for before stopping and freezing the layout engine. | 15000 |
| <b>onEngineTick</b>(<i>fn</i>) | Callback function invoked at every tick of the simulation engine. | - |
| <b>onEngineStop</b>(<i>fn</i>) | Callback function invoked when the simulation engine stops and the layout is frozen. | - |

### Interaction

| Method | Description | Default |
| --- | --- | :--: |
| <b>onNodeClick</b>(<i>fn</i>) | Callback function for node (left-button) clicks. The node object is included as single argument `onNodeClick(node)`. | - |
| <b>onNodeRightClick</b>(<i>fn</i>) | Callback function for node right-clicks. The node object is included as single argument `onNodeRightClick(node)`. | - |
| <b>onNodeHover</b>(<i>fn</i>) | Callback function for node mouse over events. The node object (or `null` if there's no node under the mouse line of sight) is included as the first argument, and the previous node object (or null) as second argument: `onNodeHover(node, prevNode)`. | - |
| <b>onNodeDrag</b>(<i>fn</i>) | Callback function for node drag interactions. This function is invoked repeatedly while dragging a node, every time its position is updated. The node object is included as single argument `onNodeDrag(node)`. | - |
| <b>onNodeDragEnd</b>(<i>fn</i>) | Callback function for the end of node drag interactions. This function is invoked when the node is released. The node object is included as single argument `onNodeDragEnd(node)`. | - |
| <b>onLinkClick</b>(<i>fn</i>) | Callback function for link (left-button) clicks. The link object is included as single argument `onLinkClick(link)`. | - |
| <b>onLinkRightClick</b>(<i>fn</i>) | Callback function for link right-clicks. The link object is included as single argument `onLinkRightClick(link)`. | - |
| <b>onLinkHover</b>(<i>fn</i>) | Callback function for link mouse over events. The link object (or `null` if there's no link under the mouse line of sight) is included as the first argument, and the previous link object (or null) as second argument: `onLinkHover(link, prevLink)`. | - |
| <b>linkHoverPrecision</b>([<i>int</i>]) | Whether to display the link label when hovering the link closely (low value) or from far away (high value). | 4 |
| <b>onZoom</b>(<i>fn</i>) | Callback function for zoom/pan events. The current zoom transform is included as single argument `onZoom({ k, x, y })`. Note that `onZoom` is triggered by user interaction as well as programmatic zooming/panning with `zoom()` and `centerAt()`. | - |
| <b>enableNodeDrag</b>([<i>boolean</i>]) | Getter/setter for whether to enable the user interaction to drag nodes by click-dragging. If enabled, every time a node is dragged the simulation is re-heated so the other nodes react to the changes. Only applicable if enablePointerInteraction is `true`. | `true` |
| <b>enableZoomPanInteraction</b>([<i>boolean</i>]) | Getter/setter for whether to enable zooming and panning user interactions. | `true` |
| <b>enablePointerInteraction</b>([<i>boolean</i>]) | Getter/setter for whether to enable the mouse tracking events. This activates an internal tracker of the canvas mouse position and enables the functionality of object hover/click/drag and tooltip labels, at the cost of performance. If you're looking for maximum gain in your graph performance it's recommended to switch off this property. | `true` |

### Input JSON syntax
```
{
    "nodes": [
        {
          "id": "id1",
          "name": "name1",
          "val": 1
        },
        {
          "id": "id2",
          "name": "name2",
          "val": 10
        },
        (...)
    ],
    "links": [
        {
            "source": "id1",
            "target": "id2"
        },
        (...)
    ]
}
```

## Giving Back

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=L398E7PKP47E8&currency_code=USD&source=url) If this project has helped you and you'd like to contribute back, you can always [buy me a ☕](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=L398E7PKP47E8&currency_code=USD&source=url)!
