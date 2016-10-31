import detectIt from 'detect-it';
import passiveEventSupport from './detectPassiveEventSupport';

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
    notifyOfNextSubs[eType].splice([subsIDs[eType][id]], 1);
    delete subsIDs[eType][id];
  }
}

export function notifyOfAll(events, callback) {
  events.forEach((event) => {
    notifyOfAllSubs[event] = callback;
  });
}

function eventHandler(e) {
  notifyOfAllSubs[e.type] && notifyOfAllSubs[e.type](e);
  if (notifyOfNextSubs[e.type].length === 0) return;
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

const listenerOptions = passiveEventSupport ? {
  capture: true,
  passive: true,
} : true;

function setupEvent(event) {
  notifyOfNextSubs[event] = [];
  subsIDs[event] = {};
  document.addEventListener(event, eventHandler, listenerOptions);
}

if (detectIt.hasTouchEventsApi) {
  ['touchstart', 'touchend', 'touchcancel'].forEach((event) => {
    setupEvent(event);
  });
}

if (detectIt.deviceType !== 'touchOnly') {
  ['mouseenter', 'mouseleave', 'mousemove', 'mousedown', 'mouseup'].forEach((event) => {
    setupEvent(event);
  });
}

['scroll', 'dragstart'].forEach((event) => {
  setupEvent(event);
});

notifyOfNextSubs.mutation = [];
subsIDs.mutation = {};

const observer = new MutationObserver(eventHandler.bind(null, { type: 'mutation' }));
observer.observe(document, { childList: true, attributes: true, subtree: true });
