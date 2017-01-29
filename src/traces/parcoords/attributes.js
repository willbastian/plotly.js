/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var colorAttributes = require('../../components/colorscale/color_attributes');
var colorbarAttrs = require('../../components/colorbar/attributes');
var colorscales = require('../../components/colorscale/scales');
var axesAttrs = require('../../plots/cartesian/layout_attributes');
var padAttrs = require('../../plots/pad_attributes');

var extendDeep = require('../../lib/extend').extendDeep;
var extendFlat = require('../../lib/extend').extendFlat;

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
        label: {
            valType: 'string',
            role: 'info',
            description: 'The shown name of the dimension.'
        },
        tickvals: axesAttrs.tickvals,
        ticktext: axesAttrs.ticktext,
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
        description: 'The dimensions (variables) of the parallel coordinates chart. 2..60 dimensions are supported.'
    },

    pad: extendDeep({}, padAttrs, {
        description: 'Set the padding of the `parcoords` component along each side to provide space for annotations.'
    }, {t: {dflt: 80}, l: {dflt: 80}, r: {dflt: 80}, b: {dflt: 80}}),

    line: extendFlat({},

        // the default autocolorscale isn't quite usable for parcoords due to context ambiguity around 0 (grey, off-white)
        // autocolorscale therefore defaults to false too, to avoid being overridden by the  blue-white-red autocolor palette
        extendDeep(
            {},
            colorAttributes('line'),
            {
                colorscale: extendDeep(
                    {},
                    colorAttributes('line').colorscale,
                    {dflt: colorscales.Viridis}
                ),
                autocolorscale: extendDeep(
                    {},
                    colorAttributes('line').autocolorscale,
                    {dflt: false}
                )

            }
        ),

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
    )
};
