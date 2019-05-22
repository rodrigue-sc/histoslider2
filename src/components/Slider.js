import React, { Component } from 'react';
import { bool, number, shape, arrayOf, func, string, object } from 'prop-types';
import { format as d3Format } from 'd3-format';
import { findBucket, findBucketFromPosition } from './Histoslider';

const handleStyle = {
  cursor: 'move',
  userSekect: 'none',
  MozUserSelect: 'none',
  KhtmlUserSelect: 'none',
  WebkitUserSelect: 'none',
  OUserSelect: 'none',
};

export const mapToKeyCode = code => {
  const codes = {
    37: -1,
    38: 1,
    39: 1,
    40: -1,
  };
  return codes[code] || null;
};

export const sliderPropTypes = {
  cursorRadius: number,
  data: arrayOf(
    shape({
      x0: number,
      x: number,
      y: number,
      label: string,
      id: string,
      index: number,
    }),
  ).isRequired,
  handleLabelFormat: string,
  height: number,
  sliderStyle: object,
  width: number,
};

export default class Slider extends Component {
  static propTypes = {
    ...sliderPropTypes,
    bucketSize: number,
    dragChange: func,
    hasScale: bool,
    histogramPadding: number,
    innerWidth: number,
    keyboardStep: number,
    onChange: func,
    padding: number,
    reset: func,
    scale: func,
    selectionColor: string,
    selection: arrayOf(number).isRequired,
    sliderTrackHeight: number,
  };

  static defaultProps = {
    cursorRadius: 15,
    sliderStyle: {
      display: 'block',
      paddingBottom: '8px',
      zIndex: 6,
      overflow: 'visible',
      marginTop: '-8px',
    },
    keyboardStep: 1,
    sliderTrackHeight: 8,
  };

  constructor(props) {
    super(props);

    this.cursorRefs = [];
    this.node = {};
    this.state = {
      dragging: false,
    };
  }

  componentDidMount() {
    window.addEventListener('mouseup', this.dragEnd, false);
    window.addEventListener('touchend', this.dragEnd, false);
  }

  componentWillUnmount() {
    window.removeEventListener('mouseup', this.dragEnd, false);
    window.removeEventListener('touchend', this.dragEnd, false);
  }

  dragStart = index => event => {
    const { dragChange } = this.props;
    const { dragging } = this.state;

    event.stopPropagation();
    if (!dragging) {
      this.setState(
        {
          dragging: true,
          dragIndex: index,
        },
        () => {
          dragChange(true);
        },
      );
    }
  };

  dragEnd = event => {
    const { dragChange, onChange, selection, data } = this.props;
    const { dragIndex } = this.state;

    event.stopPropagation();
    this.setState(
      {
        dragging: false,
        dragIndex: null,
      },
      () => {
        const currentSelection = selection[dragIndex];
        const currentInterval = data.find(
          ({ x, x0 }) => currentSelection >= x0 && currentSelection < x,
        );

        if (currentInterval) {
          const roundedSelection =
            currentSelection - currentInterval.x0 <
            currentInterval.x - currentSelection
              ? currentInterval.x0
              : currentInterval.x;
          const newSelection = selection.slice();

          console.log(
            'currentInterval',
            currentInterval,
            roundedSelection,
            selection,
          );

          newSelection[dragIndex] = roundedSelection;
          onChange(newSelection);
        }

        dragChange(false);
      },
    );
  };

  dragFromSVG = event => {
    const {
      bucketSize,
      data,
      dragChange,
      hasScale,
      onChange,
      scale,
      selection,
      width,
    } = this.props;
    const { dragging } = this.state;

    if (!dragging && event.nativeEvent.offsetX) {
      const bucket = findBucketFromPosition({
        bucketSize,
        data,
        width,
        xPos: event.nativeEvent.offsetX,
      });

      let selected = hasScale
        ? scale.invert(event.nativeEvent.offsetX)
        : bucket.x0;
      let dragIndex;

      if (
        Math.abs(selected - selection[0]) > Math.abs(selected - selection[1])
      ) {
        selection[1] = hasScale ? selected : bucket.x;
        dragIndex = 0;
      } else {
        selection[0] = selected;
        dragIndex = 1;
      }

      onChange(selection);
      this.setState(
        {
          dragging: true,
          dragIndex,
        },
        () => {
          dragChange(true);
        },
      );
    }
  };

  mouseMove = event => {
    const {
      onChange,
      hasScale,
      scale,
      selection,
      bucketSize,
      data,
      width,
    } = this.props;
    const { dragging, dragIndex } = this.state;

    if (dragging) {
      const bucket = findBucketFromPosition({
        bucketSize,
        data,
        width,
        xPos: event.nativeEvent.offsetX,
      });

      selection[dragIndex] = hasScale
        ? scale.invert(event.nativeEvent.offsetX)
        : dragIndex === 0
        ? bucket.x0
        : bucket.x;
      onChange(selection);
    }
  };

  touchMove = ({ touches }) => {
    const {
      onChange,
      hasScale,
      scale,
      selection,
      bucketSize,
      data,
      width,
    } = this.props;
    const { dragging, dragIndex } = this.state;

    if (dragging) {
      const left = this.node.getBoundingClientRect().left;
      const offsetX = touches[0].pageX - left;
      const newSelection = selection.slice();

      const bucket = findBucketFromPosition({
        bucketSize,
        data,
        width,
        xPos: offsetX,
      });

      newSelection[dragIndex] = hasScale
        ? scale.invert(offsetX)
        : dragIndex === 0
        ? bucket.x0
        : bucket.x;
      onChange(newSelection);
    }
  };

  keyDown = index => event => {
    const { keyboardStep, onChange, selection } = this.props;

    const direction = mapToKeyCode(event.keyCode);
    let selections = [...selection];
    selections[index] = Math.round(
      selections[index] + direction * keyboardStep,
    );
    onChange(selections);
  };

  renderCursor = (cursorValue, index) => {
    const {
      cursorRadius,
      handleLabelFormat,
      hasScale,
      bucketSize,
      scale,
      selectedColor,
      width,
      data,
    } = this.props;
    const formatter = d3Format(handleLabelFormat);

    const bucket = findBucket({ bucketSize, cursorValue, data });
    const calculatedCursorValue = hasScale
      ? scale(cursorValue)
      : bucket.index * (width / bucketSize);

    return (
      <g
        tabIndex={0}
        onKeyDown={this.keyDown(index)}
        transform={`translate(${calculatedCursorValue}, 0)`}
        key={`handle-${index}`}
      >
        <circle
          style={handleStyle}
          r={cursorRadius}
          cx={0}
          cy={12.5}
          fill="white"
          stroke={selectedColor}
          strokeWidth="1"
        />

        <rect fill={selectedColor} width={1} height={9} x={-3} y={8} />
        <rect fill={selectedColor} width={1} height={9} x={0} y={8} />
        <rect fill={selectedColor} width={1} height={9} x={3} y={8} />

        <circle
          style={handleStyle}
          onMouseDown={this.dragStart(index)}
          onTouchMove={this.touchMove}
          onTouchStart={this.dragStart(index)}
          ref={node => (this.cursorRefs[index] = node)}
          r={cursorRadius + 20}
          cx={0}
          cy={12.5}
          fill="transparent"
        />
      </g>
    );
  };

  render() {
    const {
      selection,
      scale,
      width,
      height,
      reset,
      selectedColor,
      unselectedColor,
      sliderStyle,
      bucketSize,
      data,
      hasScale,
      sliderTrackHeight,
    } = this.props;

    /*
    const selectionWidth = hasScale
      ? Math.abs(scale(selection[1]) - scale(selection[0]))
      : width / bucketSize;
      */
    const selectionSorted = Array.from(selection).sort((a, b) => +a - +b);

    const leftBucket = findBucket({
      bucketSize,
      cursorValue: selectionSorted[0],
      data,
    });
    const calculatedX = hasScale
      ? scale(selectionSorted[0])
      : leftBucket.index * (width / bucketSize);

    const rightBucket = findBucket({
      bucketSize,
      cursorValue: selectionSorted[1],
      data,
    });

    const selectionWidth = hasScale
      ? Math.abs(scale(selection[1]) - scale(selection[0]))
      : (rightBucket.index - leftBucket.index) * (width / bucketSize);

    /*const leftSelection = selection[0];
    const leftInterval = data.find(
      ({ x, x0 }) => leftSelection >= x0 && leftSelection < x,
    );

    const rightSelection = selection[1];
    const rightInterval = data.find(
      ({ x, x0 }, index) =>
        (rightSelection >= x0 && rightSelection < x) ||
        index === bucketSize - 1,
    );*/

    return (
      <svg
        style={sliderStyle}
        height={height}
        width={width}
        onMouseDown={this.dragFromSVG}
        onDoubleClick={e => reset(e)}
        onMouseMove={this.mouseMove}
        ref={e => (this.node = e)}
      >
        <rect
          height={sliderTrackHeight}
          fill={unselectedColor}
          x={0}
          y={10}
          width={width}
        />
        <rect
          height={sliderTrackHeight}
          fill={selectedColor}
          x={calculatedX}
          y={10}
          width={selectionWidth}
        />
        {selection.map(this.renderCursor)}
      </svg>
    );
  }
}
