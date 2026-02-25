# mi-map-mapbox



<!-- Auto Generated Below -->


## Properties

| Property                       | Attribute                         | Description                                                                                                                                                                                                                                                                                                                                                   | Type                                                                                                            | Default                                                                                                                                             |
| ------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accessToken`                  | `access-token`                    | The MapBox access token.                                                                                                                                                                                                                                                                                                                                      | `string`                                                                                                        | `undefined`                                                                                                                                         |
| `bearing`                      | `bearing`                         | Set or get the bearing of the map.                                                                                                                                                                                                                                                                                                                            | `string`                                                                                                        | `'0'`                                                                                                                                               |
| `disableExternalLinks`         | `disable-external-links`          | Set to true to prevent external links on the map from opening. This can be useful when running the map on a kiosk where you never want the browser to navigate away.                                                                                                                                                                                          | `boolean`                                                                                                       | `false`                                                                                                                                             |
| `floorIndex`                   | `floor-index`                     | Set or get the current floor index shown on the map.                                                                                                                                                                                                                                                                                                          | `string`                                                                                                        | `undefined`                                                                                                                                         |
| `floorSelectorControlPosition` | `floor-selector-control-position` | Render the floor selector as a Map Control at the given position.                                                                                                                                                                                                                                                                                             | `"bottom-left" \| "bottom-right" \| "top-left" \| "top-right"`                                                  | `undefined`                                                                                                                                         |
| `language`                     | `language`                        | Set the component language. Default set to English (en). Will not react to changes.                                                                                                                                                                                                                                                                           | `string`                                                                                                        | `'en'`                                                                                                                                              |
| `maxPitch`                     | `max-pitch`                       | Set or get the max pitch of the map (0-85).                                                                                                                                                                                                                                                                                                                   | `number`                                                                                                        | `60`                                                                                                                                                |
| `maxZoom`                      | `max-zoom`                        | Set or get the max zoom level of the map.                                                                                                                                                                                                                                                                                                                     | `string`                                                                                                        | `undefined`                                                                                                                                         |
| `miApiKey`                     | `mi-api-key`                      | The MapsIndoors API key.                                                                                                                                                                                                                                                                                                                                      | `string`                                                                                                        | `''`                                                                                                                                                |
| `myPositionControlPosition`    | `my-position-control-position`    | Render the My Position Control as a Map Control at the given position.                                                                                                                                                                                                                                                                                        | `"bottom-left" \| "bottom-right" \| "top-left" \| "top-right"`                                                  | `undefined`                                                                                                                                         |
| `pitch`                        | `pitch`                           | Set or get the pitch (tilt) of the map. Measured in degrees (0-60).                                                                                                                                                                                                                                                                                           | `string`                                                                                                        | `'0'`                                                                                                                                               |
| `polygonHighlightOptions`      | --                                | Styling of polygon highlight when a location is clicked. Set it to null to turn off highlighting.                                                                                                                                                                                                                                                             | `{ strokeColor: string; strokeOpacity: number; strokeWeight: number; fillColor: string; fillOpacity: number; }` | `{         strokeColor: '#EF6CCE',         strokeOpacity: 1,         strokeWeight: 2,         fillColor: '#EF6CCE',         fillOpacity: 0.2     }` |
| `polylineOptions`              | --                                | Styling of how the polyline looks when getting a route. Color: The stroke color of direction polyline on the map. Accepts any legal HTML color value. Default: '#307ad9'. Opacity: The stroke opacity of directions polylines on the map. Numerical value between 0.0 and 1.0. Default: 1. Weight: The width of the direction polyline in pixels. Default: 4. | `{ color: string; weight: number; opacity: number; }`                                                           | `{         color: '#3071d9',         opacity: 1,         weight: 4     }`                                                                           |
| `zoom`                         | `zoom`                            | Set or get the current zoom level of the map.                                                                                                                                                                                                                                                                                                                 | `string`                                                                                                        | `'17'`                                                                                                                                              |


## Events

| Event              | Description                                                                 | Type               |
| ------------------ | --------------------------------------------------------------------------- | ------------------ |
| `mapsIndoorsReady` | Ready event emitted when the MapsIndoors has been initialized and is ready. | `CustomEvent<any>` |


## Methods

### `clearHighlightLocation() => Promise<void>`

Clear existing MapsIndoors location highlight.

#### Returns

Type: `Promise<void>`



### `getDirectionsRendererInstance() => Promise<any>`

Get the MapsIndoors Directions Renderer Instance.

#### Returns

Type: `Promise<any>`



### `getDirectionsServiceInstance() => Promise<any>`

Get the MapsIndoors Directions Service Instance.

#### Returns

Type: `Promise<any>`



### `getMapInstance() => Promise<any>`

Get the map instance.

#### Returns

Type: `Promise<any>`



### `getMapsIndoorsInstance() => Promise<any>`

Get the MapsIndoors instance.

#### Returns

Type: `Promise<any>`



### `highlightLocation(location: Location) => Promise<void>`

Highlight a MapsIndoors location. Only a single location can be highlighted at the time.

#### Returns

Type: `Promise<void>`




----------------------------------------------


