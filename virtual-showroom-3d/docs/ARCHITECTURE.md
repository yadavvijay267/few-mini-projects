# Architecture

## Scene

`src/index.html` builds two rooms (Living Room, Workspace) from Three.js
primitives: floors, walls, rugs, tables, and one 3D mesh per product
(sofa = rounded boxes, lamp = cylinder + cone shade, desk = slab +
legs, chair, monitor, bookshelf, plant, rug). Each product mesh is
clickable (raycasting) and opens the detail panel.

## Navigation

WASD/arrows move the camera; drag rotates the view. Floor hotspots
(glowing rings) are click-to-move: clicking one glides the camera to
that room. Movement is clamped to the showroom bounds.

## Shortlist

`shortlist` in localStorage: an array of product ids. Add/remove from
the detail panel; the shortlist panel shows names, prices and a total,
and can be exported as JSON. It survives a page reload.

## Day/night

A toggle swaps the lighting rig: day = bright directional "sun" +
cool ambient; night = warm dim point lights + a dark blue ambient and
lit lamp shades. The same products are lit realistically in both.

## Production path

Replace the primitive meshes with loaded GLTF models, load the
catalogue from a real store API, and add a checkout step for the
shortlist. Keep the hotspot navigation and the day/night contract.
