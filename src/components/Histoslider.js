import React, { Component } from 'react';
import {
  bool,
  func,
  number,
  string,
  object,
  shape,
  aeeayOf,
  arrayOf,
} from 'prop-types';
import { max, min } from 'd3-array';
import { scaleLinear as linear } from 'd3-scale';

import Histogram from './Histogram';
import Slider, { sliderPropTypes } from './Slider';

const SLIDER_HEIGHT = 30;

export const findBucket = ({ bucketSize, cursorValue, data }) => {
  const bucket = data.find(({ x, x0 }) => cursorValue >= x0 && cursorValue < x);

  if (!bucket) {
    const lastBucket = data[bucketSize - 1];
    if (cursorValue >= lastBucket.x) {
      //Fake bucket
      return {
        x0: lastBucket.x,
        x: lastBucket.x + 1,
        y: 1,
        label: lastBucket.label,
        index: bucketSize,
      };
    }
    return lastBucket;
  }

  return bucket;
};

export const findBucketFromPosition = ({ bucketSize, data, width, xPos }) => {
  if (xPos > width) {
    return data[bucketSize - 1];
  }

  if (xPos < 0) {
    return data[0];
  }

  const intervalWidth = width / bucketSize;
  const indexPos = xPos / intervalWidth;

  const bucket = data.find(
    ({ index }) => indexPos >= index && indexPos < index + 1,
  );

  if (!bucket) {
    return data[bucketSize - 1];
  }

  return bucket;
};

export default class Histoslider extends Component {
  static propTypes = {
    ...sliderPropTypes,
    onChange: func.isRequired,
    selectedColor: string,
    unselectedColor: string,
    selection: arrayOf(number),
    barStyle: object,
    barBorderRadius: number,
    barPadding: number,
    histogramStyle: object,
    showOnDrag: bool,
    style: object,
    disableHistogram: bool,
    hasScale: bool,
  };

  static defaultProps = {
    sliderSelectedColor: '#0074D9',
    histogramSelectedColor: '#0074D9',
    unselectedColor: '#DDDDDD',
    showOnDrag: false,
    width: 400,
    height: 200,
    barBorderRadius: 2,
    barPadding: 3,
    padding: 20,
    sliderHeight: 25,
    handleLabelFormat: '0.3P',
    hasScale: true,
  };

  constructor(props) {
    super(props);

    this.state = {
      dragging: false,
    };
  }

  dragChange = dragging => {
    this.setState({ dragging });
  };

  onChange = selection => {
    const { data, onChange } = this.props;

    const sortedData = data.sort((a, b) => +a.x0 - +b.x0);
    const extent = [
      min(sortedData, ({ x0 }) => +x0),
      max(sortedData, ({ x }) => +x),
    ];
    onChange(selection.map(d => Math.max(extent[0], Math.min(extent[1], +d))));
  };

  reset = () => {
    const { onChange } = this.props;

    onChange(null);
  };

  render() {
    const {
      style,
      data,
      width,
      height,
      padding,
      selection,
      sliderHeight,
      disableHistogram,
      hasScale,
      sliderSelectedColor,
      histogramSelectedColor,
    } = this.props;
    const { dragging } = this.state;

    const innerHeight = height - padding * 2;
    const innerWidth = width - padding * 2;
    const histogramHeight = innerHeight - sliderHeight;

    const sortedData = data.sort((a, b) => +a.x0 - +b.x0);
    const extent = [
      min(sortedData, ({ x0 }) => +x0),
      max(sortedData, ({ x }) => +x),
    ];
    const maxValue = max(sortedData, ({ y }) => +y);
    const scale = linear()
      .domain(extent)
      .range([0, innerWidth]);
    scale.clamp(true);

    const selections = selection || extent;

    const bucketSize = Object.keys(sortedData).length;

    const overrides = {
      selection: selections,
      data: sortedData,
      scale,
      hasScale,
      max: maxValue,
      dragChange: this.dragChange,
      onChange: this.onChange,
      reset: this.reset,
      width: innerWidth,
      dragging: dragging,
      bucketSize,
    };

    const leftBucket = findBucket({
      bucketSize,
      cursorValue: selections[0],
      data: sortedData,
    });

    const rightBucket = findBucket({
      bucketSize,
      cursorValue: selections[1],
      data: sortedData,
    });

    const minMaxColor = '#5C5C5C';

    return (
      <div
        style={Object.assign({}, style, {
          width,
          padding,
          paddingTop: 10,
          boxSizing: 'border-box',
          position: 'relative',
        })}
        className="Histoslider Histoslider--wrapper"
      >
        <svg height={30} width={innerWidth}>
          <text x={0} y={10} fontSize={12} fontWeight="bold" fill={minMaxColor}>
            {'Min: '}
          </text>
          <text x={0} y={25} fontSize={15} fontWeight="bold">
            {leftBucket.label}
          </text>

          <text
            textAnchor="end"
            x={innerWidth}
            y={10}
            fontSize={12}
            fontWeight="bold"
            fill={minMaxColor}
          >
            {'Max: '}
          </text>
          <text
            textAnchor="end"
            x={innerWidth}
            y={25}
            fontSize={15}
            fontWeight="bold"
          >
            {rightBucket.label}
          </text>
        </svg>

        {!disableHistogram && (
          <Histogram
            {...Object.assign({}, this.props, overrides, {
              height: histogramHeight,
              selectedColor: histogramSelectedColor,
            })}
          />
        )}
        <Slider
          {...Object.assign({}, this.props, overrides, {
            height: sliderHeight,
            selectedColor: sliderSelectedColor,
          })}
        />
      </div>
    );
  }
}
