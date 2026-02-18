# mi-my-position



<!-- Auto Generated Below -->


## Properties

| Property                 | Attribute             | Description                                                                                                                                                                                           | Type                | Default     |
| ------------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------- |
| `customPositionProvider` | --                    | Accepts a custom position provider instance (supports both legacy and modern interfaces). This is the external API - what users pass to the component. It's optional and may be undefined or invalid. | `IPositionProvider` | `undefined` |
| `mapsindoors`            | `mapsindoors`         | MapsIndoors instance.                                                                                                                                                                                 | `any`               | `undefined` |
| `myPositionOptions`      | `my-position-options` | Reference: https://app.mapsindoors.com/mapsindoors/js/sdk/latest/docs/PositionControlOptions.html.                                                                                                    | `any`               | `undefined` |


## Events

| Event               | Description | Type                  |
| ------------------- | ----------- | --------------------- |
| `position_error`    |             | `CustomEvent<object>` |
| `position_received` |             | `CustomEvent<object>` |


## Methods

### `setPosition(position: MapsIndoorsPosition) => Promise<void>`

Sets a custom position. Works with any provider that implements setPosition.
Uses this.positionProvider (the resolved provider) instead of this.customPositionProvider
to ensure we're working with the validated, active provider.

#### Returns

Type: `Promise<void>`



### `watchPosition(selfInvoked?: boolean) => Promise<void>`

Method for requesting the current position, emitting events and showing position on map based on result.

#### Returns

Type: `Promise<void>`




----------------------------------------------


