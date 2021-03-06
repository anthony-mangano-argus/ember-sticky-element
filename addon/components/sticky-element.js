import { or, notEmpty } from '@ember/object/computed';
import { htmlSafe } from '@ember/string';
import Component from '@ember/component';
import { computed } from '@ember/object';
import { scheduleOnce } from '@ember/runloop';
import layout from '../templates/components/sticky-element';

function elementPosition(element, offset) {
  let top = element.getBoundingClientRect().top;
  if (top - offset <= 0) {
    return 'top';
  }
  if (top + element.offsetHeight + offset <= window.innerHeight) {
    return 'in';
  }
  return 'bottom';
}

export default Component.extend({
  layout,
  classNames: ['sticky-element-container'],
  attributeBindings: ['style'],

  /**
   * The offset from the top of the viewport when to start sticking to the top
   *
   * @property top
   * @type {number}
   * @default 0
   * @public
   */
  top: 0,

  /**
   * The offset from the parents bottom edge when to start sticking to the bottom of the parent
   * When `null` (default) sticking to the bottom is disabled. Use 0 or any other appropriate offset to enable it.
   *
   * @property bottom
   * @type {boolean|null}
   * @public
   */
  bottom: null,

  /**
   * Set to false to disable sticky behavior
   *
   * @property enabled
   * @type {boolean}
   * @default true
   * @public
   */
  enabled: true,

  /**
   * The class name set on the element container.
   *
   * @property containerClassName
   * @type {string|null}
   * @default 'sticky-element'
   * @public
   */
  containerClassName: 'sticky-element',

  /**
   * The class name set on the element container when it is sticked.
   *
   * @property containerStickyClassName
   * @type {string|null}
   * @default 'sticky-element--sticky'
   * @public
   */
  containerStickyClassName: 'sticky-element--sticky',

  /**
   * The class name set on the element container when it is sticked to top.
   *
   * @property containerStickyTopClassName
   * @type {string|null}
   * @default 'sticky-element--sticky-top'
   * @public
   */
  containerStickyTopClassName: 'sticky-element--sticky-top',

  /**
   * The class name set on the element container when it is sticked to bottom.
   *
   * @property containerStickyBottomClassName
   * @type {string|null}
   * @default 'sticky-element--sticky-bottom'
   * @public
   */
  containerStickyBottomClassName: 'sticky-element--sticky-bottom',

  /**
   * @property isSticky
   * @type {boolean}
   * @readOnly
   * @private
   */
  isSticky: or('isStickyTop', 'isStickyBottom').readOnly(),

  /**
   * @property isStickyTop
   * @type {boolean}
   * @readOnly
   * @private
   */
  isStickyTop: computed('enabled', 'parentTop', 'parentBottom', 'isStickyBottom', function() {
    return this.get('enabled') && this.get('parentTop') === 'top' && !this.get('isStickyBottom');
  }).readOnly(),

  /**
   * @property isStickyBottom
   * @type {boolean}
   * @readOnly
   * @private
   */
  isStickyBottom: computed('enabled', 'parentBottom', 'stickToBottom', function() {
    return this.get('enabled') && this.get('parentBottom') !== 'bottom' && this.get('stickToBottom');
  }).readOnly(),

  /**
   * @property parentTop
   * @type {string}
   * @private
   */
  parentTop: 'bottom',

  /**
   * @property parentBottom
   * @type {string}
   * @private
   */
  parentBottom: 'bottom',

  /**
   * @property ownHeight
   * @type {number}
   * @private
   */
  ownHeight: 0,

  /**
   * @property ownWidth
   * @type {number}
   * @private
   */
  ownWidth: 0,

  /**
   * @property stickToBottom
   * @type {boolean}
   * @readOnly
   * @private
   */
  stickToBottom: notEmpty('bottom').readOnly(),

  /**
   * @property windowHeight
   * @type {number}
   * @private
   */
  windowHeight: 0,

  /**
   * @property topTriggerElement
   * @private
   */
  topTriggerElement: null,

  /**
   * @property bottomTriggerElement
   * @private
   */
  bottomTriggerElement: null,

  /**
   * @property offsetBottom
   * @type {number}
   * @private
   */
  offsetBottom: computed('top', 'ownHeight', 'bottom', 'windowHeight', function() {
    let { top, ownHeight, bottom, windowHeight } = this.getProperties('top', 'ownHeight', 'bottom', 'windowHeight');
    return (windowHeight - top - ownHeight - bottom);
  }),

  /**
   * Dynamic style for the components element
   *
   * @property style
   * @type {string}
   * @private
   */
  style: computed('isSticky', 'ownHeight', 'ownWidth', function() {
    let height = this.get('ownHeight');
    let width = this.get('ownWidth');
    if (height > 0 && this.get('isSticky')) {
      return htmlSafe(`height: ${height}px; width: ${width}px`);
    }
  }),

  /**
   * Dynamic style for the sticky container (`position: fixed`)
   *
   * @property containerStyle
   * @type {string}
   * @private
   */
  containerStyle: computed('isStickyTop', 'isStickyBottom', 'top', 'bottom', function() {
    if (this.get('isStickyBottom')) {
      let style = `position: absolute; bottom: ${this.get('bottom')}px; width: ${this.get('ownWidth')}px`;
      return htmlSafe(style);
    }
    if (this.get('isStickyTop')) {
      let style = `position: fixed; top: ${this.get('top')}px; width: ${this.get('ownWidth')}px`;
      return htmlSafe(style);
    }
  }),

  /**
   * @method updateDimension
   * @private
   */
  updateDimension() {
    this.set('windowHeight', window.innerHeight);
    this.set('ownHeight', this.element.offsetHeight);
    this.set('ownWidth', this.element.offsetWidth);
  },

  updatePosition() {
    let { topTriggerElement, bottomTriggerElement } = this;

    if (topTriggerElement) {
      this.set('parentTop', elementPosition(topTriggerElement, this.get('top')));
    }
    if (bottomTriggerElement) {
      this.set('parentBottom', elementPosition(bottomTriggerElement, this.get('offsetBottom')));
    }
  },

  didInsertElement() {
    this._super(...arguments);
    scheduleOnce('afterRender', this, this.updateDimension);
  },

  actions: {
    parentTopEntered() {
      // console.log('parentTopEntered');
      this.set('parentTop', 'in');
    },
    parentTopExited() {
      // make sure we captured the right dimensions before getting sticky!
      // console.log('parentTopExited');
      this.updateDimension();
      this.updatePosition();
    },
    parentBottomEntered() {
      // console.log('parentBottomEntered');
      this.set('parentBottom', 'in');
    },
    parentBottomExited() {
      // console.log('parentBottomExited');
      this.updatePosition();
    },
    registerTopTrigger(element) {
      this.topTriggerElement = element;
      this.updatePosition();
    },
    registerBottomTrigger(element) {
      this.bottomTriggerElement = element;
      this.updatePosition();
    }
  }
});
