/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var colorAttributes = require('../../components/colorscale/color_attributes');
var colorbarAttrs = require('../../components/colorbar/attributes');

var extendFlat = require('../../lib/extend').extendFlat;

/*
todo comments (some of them relating to items that should be unexposed anyway):
- `domain` should be DRYed up across other plots
- add attribute to `dimensions` for switching dimensions on/off
- add attribute to `dimensions` for initial filter domain
- clarify what the actual use of `_isLinkedToArray: 'dimension'` - esp. the value - is below
- add attribute for color clamping
- switch to ploty standard color notation rather than RGB tuple
- switch to 0..1 for opacity rather than 0..255
- tie pixelratio to window.devicePixelRatio in `defaults.js`
- consider if we need a `focusopacity` attribute besides focusalphablending; making settings more symmetric between
      focus and context
- hardcode verticalpadding
- this minor but ergonomic `integerpadding` isn't fully working yet - either finish it or remove it
*/

module.exports = {

    domain: {
        x: {
            valType: 'info_array',
            role: 'info',
            items: [
                {valType: 'number', min: 0, max: 1},
                {valType: 'number', min: 0, max: 1}
            ],
            dflt: [0, 1],
            description: [
                'Sets the horizontal domain of this `parcoords` trace',
                '(in plot fraction).'
            ].join(' ')
        },
        y: {
            valType: 'info_array',
            role: 'info',
            items: [
                {valType: 'number', min: 0, max: 1},
                {valType: 'number', min: 0, max: 1}
            ],
            dflt: [0, 1],
            description: [
                'Sets the vertical domain of this `parcoords` trace',
                '(in plot fraction).'
            ].join(' ')
        }
    },

    dimensions: {
        _isLinkedToArray: 'dimension',
        id: {
            valType: 'string',
            role: 'info',
            description: 'Identifier of a dimension. Must be a unique string across all dimensions.'
        },
        label: {
            valType: 'string',
            role: 'info',
            description: 'The shown name of the dimension.'
        },
        integer: {
            valType: 'boolean',
            dflt: false,
            role: 'info',
            description: 'The shown name of the dimension.'
        },
        visible: {
            valType: 'boolean',
            dflt: true,
            role: 'info',
            description: 'Shows the dimension when set to `true` (the default). Hides the dimension for `false`.'
        },
        range: {
            valType: 'data_array',
            role: 'info',
            description: [
                'The domain range that represents the full, shown axis extent. Defaults to the `values` extent.',
                'Must be an array of `[fromValue, toValue]` with finite numbers as elements.'
            ].join(' ')
        },
        constraintrange: {
            valType: 'data_array',
            role: 'info',
            description: [
                'The domain range to which the filter on the dimension is constrained. Must be an array',
                'of `[fromValue, toValue]` with finite numbers as elements.'
            ].join(' ')
        },
        values: {
            valType: 'data_array',
            role: 'info',
            description: [
                'Dimension values. `values[n]` represents the value of the `n`th point in the dataset,',
                'therefore the `values` vector for all dimensions must be the same (longer vectors',
                'will be truncated). Each value must be a finite number.'
            ].join(' ')
        },
        description: 'The dimensions (variables) of the parallel coordinates chart. 2..63 dimensions are supported.'
    },

    tickdistance: {
        valType: 'number',
        dflt: 50,
        min: 32,
        role: 'style',
        description: 'The desired approximate tick distance (in pixels) between axis ticks on an axis.'
    },

    padding: {
        valType: 'number',
        dflt: 80,
        min: 0,
        role: 'style',
        description: 'The desired space for displaying axis labels and domain ranges around the actual parcoords.'
    },

    line: extendFlat({},
        colorAttributes('line'),
        {
            showscale: {
                valType: 'boolean',
                role: 'info',
                dflt: false,
                description: [
                    'Has an effect only if `marker.color` is set to a numerical array.',
                    'Determines whether or not a colorbar is displayed.'
                ].join(' ')
            },
            colorbar: colorbarAttrs
        }
    ),

    blocklinecount: {
        valType: 'number',
        dflt: 5000,
        min: 1,
        role: 'info',
        description: [
            'The number of lines rendered in one 16ms rendering frame. Use 2000-5000 on low-end hardware to remain',
            'responsive, and 10000 .. 100000 on strong hardware for faster rendering.'
        ].join(' ')
    },

    lines: {
        contextcolor: {
            valType: 'data_array',
            dflt: [0, 0, 0],
            role: 'style',
            description: 'Color of the context line layer as an RGB triplet where each number is 0..255.'
        },

        contextopacity: {
            valType: 'number',
            dflt: 0.025,
            min: 0,
            max: 1,
            role: 'style',
            description: 'Opacity of the context lines, on a scale of 0 (invisible) to 1 (fully opaque).'
        },

        pixelratio: {
            valType: 'number',
            dflt: 1,
            min: 0.25,
            max: 4,
            role: 'style',
            description: 'Line rendering pixel ratio. A lower value yields faster rendering but blockier lines.'
        },

        focusalphablending: {
            valType: 'boolean',
            dflt: false,
            role: 'style',
            description: [
                'By default, the rendered lines are opaque. Setting it to `true` is necessary if opacity is needed.'
            ].join(' ')
        }
    }
};
