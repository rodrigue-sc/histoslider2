import React, { Component } from 'react';
import { bool, number, shape, arrayOf, func, string, object } from 'prop-types';
import { format as d3Format } from 'd3-format';

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
    const { dragChange, hasScale, onChange, scale, selection } = this.props;
    const { dragging } = this.state;

    if (!dragging && event.nativeEvent.offsetX) {
      const bucket = this.findBucketFromPosition(event.nativeEvent.offsetX);

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
    const { onChange, hasScale, scale, selection } = this.props;
    const { dragging, dragIndex } = this.state;

    if (dragging) {
      const bucket = this.findBucketFromPosition(event.nativeEvent.offsetX);

      selection[dragIndex] = hasScale
        ? scale.invert(event.nativeEvent.offsetX)
        : dragIndex === 0
        ? bucket.x0
        : bucket.x;
      onChange(selection);
    }
  };

  touchMove = ({ touches }) => {
    const { onChange, hasScale, scale, selection } = this.props;
    const { dragging, dragIndex } = this.state;

    if (dragging) {
      const left = this.node.getBoundingClientRect().left;
      const offsetX = touches[0].pageX - left;
      const newSelection = selection.slice();

      const bucket = this.findBucketFromPosition(offsetX);

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

  findBucket = cursorValue => {
    const { bucketSize, data } = this.props;

    const bucket = data.find(
      ({ x, x0 }) => cursorValue >= x0 && cursorValue < x,
    );

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

  findBucketFromPosition = xPos => {
    const { bucketSize, data, width } = this.props;

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

  renderCursor = (cursorValue, index) => {
    const {
      cursorRadius,
      handleLabelFormat,
      hasScale,
      bucketSize,
      scale,
      selectedColor,
      width,
    } = this.props;
    const formatter = d3Format(handleLabelFormat);

    const bucket = this.findBucket(cursorValue);
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
        <image
          style={handleStyle}
          x={-3.5}
          y={7}
          //style={{ width: 20, height: 25 }}
          href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAJCAYAAAD+WDajAAABS2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxMzggNzkuMTU5ODI0LCAyMDE2LzA5LzE0LTAxOjA5OjAxICAgICAgICAiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIi8+CiA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgo8P3hwYWNrZXQgZW5kPSJyIj8+IEmuOgAAACpJREFUGJVjZMg//ZCBgUGeAQJQ2EwMDAxyDAiAwmZiwAMGpeQjJD4KGwB3gActOpAdqgAAAABJRU5ErkJggg=="
        />
        <circle
          style={handleStyle}
          onMouseDown={this.dragStart(index)}
          onTouchMove={this.touchMove}
          onTouchStart={this.dragStart(index)}
          ref={node => (this.cursorRefs[index] = node)}
          r={cursorRadius + 5}
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

    const leftBucket = this.findBucket(selectionSorted[0]);
    const calculatedX = hasScale
      ? scale(selectionSorted[0])
      : leftBucket.index * (width / bucketSize);

    const rightBucket = this.findBucket(selectionSorted[1]);

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

    const leftLabel = leftBucket.label;
    const rightLabel = rightBucket.label;

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

        <text textAnchor="middle" x={0} y={60} fontSize={15} fontWeight="bold">
          {'Min: '}
          {leftLabel}
        </text>

        <text
          textAnchor="middle"
          x={width}
          y={60}
          fontSize={15}
          fontWeight="bold"
        >
          {'Max: '}
          {rightLabel}
        </text>
      </svg>
    );
  }
}
