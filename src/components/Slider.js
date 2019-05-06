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

    console.log('data', data);

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
    const { dragChange, onChange, scale, selection } = this.props;
    const { dragging } = this.state;

    if (!dragging && event.nativeEvent.offsetX) {
      let selected = scale.invert(event.nativeEvent.offsetX);
      let dragIndex;

      if (
        Math.abs(selected - selection[0]) > Math.abs(selected - selection[1])
      ) {
        selection[1] = selected;
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
    const { onChange, scale, selection } = this.props;
    const { dragging, dragIndex } = this.state;

    if (dragging) {
      selection[dragIndex] = scale.invert(event.nativeEvent.offsetX);
      onChange(selection);
    }
  };

  touchMove = ({ touches }) => {
    const { onChange, scale, selection } = this.props;
    const { dragging, dragIndex } = this.state;

    if (dragging) {
      const left = this.node.getBoundingClientRect().left;
      const offsetX = touches[0].pageX - left;
      const newSelection = selection.slice();

      newSelection[dragIndex] = scale.invert(offsetX);
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
      scale,
      selectedColor,
    } = this.props;
    const formatter = d3Format(handleLabelFormat);

    return (
      <g
        tabIndex={0}
        onKeyDown={this.keyDown(index)}
        transform={`translate(${scale(cursorValue)}, 0)`}
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
          onMouseDown={this.dragStart(index)}
          onTouchMove={this.touchMove}
          onTouchStart={this.dragStart(index)}
          ref={node => (this.cursorRefs[index] = node)}
          x={-3.5}
          y={7}
          //style={{ width: 20, height: 25 }}
          href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAJCAYAAAD+WDajAAABS2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxMzggNzkuMTU5ODI0LCAyMDE2LzA5LzE0LTAxOjA5OjAxICAgICAgICAiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIi8+CiA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgo8P3hwYWNrZXQgZW5kPSJyIj8+IEmuOgAAACpJREFUGJVjZMg//ZCBgUGeAQJQ2EwMDAxyDAiAwmZiwAMGpeQjJD4KGwB3gActOpAdqgAAAABJRU5ErkJggg=="
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
      data,
      sliderTrackHeight,
    } = this.props;

    const selectionWidth = Math.abs(scale(selection[1]) - scale(selection[0]));
    const selectionSorted = Array.from(selection).sort((a, b) => +a - +b);

    const leftSelection = selection[0];
    const leftInterval = data.find(
      ({ x, x0 }) => leftSelection >= x0 && leftSelection < x,
    );

    const nbBuckets = Object.keys(data).length;
    const rightSelection = selection[1];
    const rightInterval = data.find(
      ({ x, x0 }, index) =>
        (rightSelection >= x0 && rightSelection < x) || index === nbBuckets - 1,
    );

    const leftLabel = leftInterval.label;
    const rightLabel = rightInterval.label;

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
          x={scale(selectionSorted[0])}
          y={10}
          width={selectionWidth}
        />
        {selection.map(this.renderCursor)}

        <text textAnchor="middle" x={0} y={60} fontSize={15} fontWeight="bold">
          {leftLabel}
        </text>

        <text
          textAnchor="middle"
          x={width}
          y={60}
          fontSize={15}
          fontWeight="bold"
        >
          {rightLabel}
        </text>
      </svg>
    );
  }
}
