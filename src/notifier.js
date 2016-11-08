import detectIt from 'detect-it';
import { passiveEventSupport } from './constants';

const notifyOfAllSubs = {};
const notifyOfNextSubs = {};
const subsIDs = {};

let idPlace = 0;
function nextID(eType) {
  if (idPlace === Number.MAX_SAFE_INTEGER) idPlace = 0;
  idPlace++;
  if (subsIDs[eType][idPlace] === undefined) return idPlace;
  return nextID(eType);
}

export function notifyOfNext(eType, callback) {
  const id = nextID(eType);
  subsIDs[eType][id] = notifyOfNextSubs[eType].push({ id, callback }) - 1;
  return id;
}

export function cancelNotifyOfNext(eType, id) {
  if (subsIDs[eType][id] !== 'undefined') {
    notifyOfNextSubs[eType][subsIDs[eType][id]].callback = () => {};
    delete subsIDs[eType][id];
  }
}

export function notifyOfAll(eTypes, callback) {
  eTypes.forEach((eType) => {
    notifyOfAllSubs[eType] = callback;
  });
}

function eventHandler(e) {
  notifyOfAllSubs[e.type] && notifyOfAllSubs[e.type](e);
  if (notifyOfNextSubs[e.type].length === 0) return;
  e.persist = () => {};
  const reNotifyOfNext = [];
  const reNotifyOfNextIDs = {};
  notifyOfNextSubs[e.type].forEach((sub) => {
    if (sub.callback(e) === 'reNotifyOfNext') {
      reNotifyOfNextIDs[sub.id] = reNotifyOfNext.push(sub) - 1;
    }
  });
  notifyOfNextSubs[e.type] = reNotifyOfNext;
  subsIDs[e.type] = reNotifyOfNextIDs;
}

function setupEvent(element, eType, capture) {
  notifyOfNextSubs[eType] = [];
  subsIDs[eType] = {};
  // const useCapture = (eType !== 'mouseenter') && (eType !== 'mouseleave');
  element.addEventListener(eType, eventHandler, passiveEventSupport ? {
    capture,
    passive: true,
  } : capture);
}

if (detectIt.hasTouchEventsApi) {
  ['touchstart', 'touchend', 'touchcancel'].forEach((eType) => {
    setupEvent(document, eType, true);
  });
}

if (detectIt.deviceType !== 'touchOnly') {
  ['mouseenter', 'mouseleave', 'mousemove', 'mousedown', 'mouseup', 'scroll'].forEach((eType) => {
    setupEvent(document, eType, !(eType === 'mouseenter' || eType === 'mouseleave'));
  });

  notifyOfNextSubs.mutation = [];
  subsIDs.mutation = {};
  const mutationEvent = {
    type: 'mutation',
    persist: () => {},
    preventDefault: () => {},
    stopPropagation: () => {},
  };
  const observer = new MutationObserver(eventHandler.bind(null, mutationEvent));
  observer.observe(document, { childList: true, attributes: true, subtree: true });
}

setupEvent(document, 'dragstart', true);

['focus', 'blur'].forEach((eType) => {
  setupEvent(window, eType, false);
});
