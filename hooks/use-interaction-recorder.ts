'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

type InteractionEvent =
  | { type: 'mousemove'; x: number; y: number; timestamp: number }
  | { type: 'click'; x: number; y: number; element: string; timestamp: number }
  | { type: 'scroll'; scrollX: number; scrollY: number; timestamp: number }
  | { type: 'touch'; x: number; y: number; timestamp: number }
  | { type: 'input'; element: string; value: string; timestamp: number }
  | { type: 'keydown'; key: string; element: string; timestamp: number };

type InteractionEventInput<T = InteractionEvent> = T extends unknown
  ? Omit<T, 'timestamp'>
  : never;

type Geolocation = {
  ip: string;
  city: string;
  region: string;
  country_name: string;
  latitude: number;
  longitude: number;
}

const MAX_ACTIVE_TIME_MS = 30000; // 30 seconds
const INITIAL_DELAY_MS = 3000; // 3 seconds
const THROTTLE_INTERVAL_MS = 500; // 500ms for frequent events
const SITE_ID = 'neup-analytics-demo'; // Hardcoded site ID

const getElementSelector = (el: HTMLElement): string => {
  if (!el) return '';
  if (el.id) return `#${el.id}`;
  if (el.tagName.toLowerCase() === 'body') return 'body';

  const parent = el.parentElement;
  if (!parent) return el.tagName.toLowerCase();

  const siblings = Array.from(parent.children).filter(
    (child) => child.tagName === el.tagName
  );
  const index = siblings.indexOf(el);

  if (siblings.length < 2) {
    return `${getElementSelector(parent)} > ${el.tagName.toLowerCase()}`;
  }

  return `${getElementSelector(
    parent
  )} > ${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
};

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

const setCookie = (name: string, value: string, days: number) => {
  if (typeof document === 'undefined') return;
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + (value || '') + expires + '; path=/';
};

export function useInteractionRecorder() {
  // const firestore = useFirestore();
  const interactionsRef = useRef<InteractionEvent[]>([]);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const startTimeRef = useRef(0);
  const pageIdRef = useRef<string | null>(null);
  const lastThrottledEventTimeRef = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const geoRef = useRef<Geolocation | null>(null);

  const getOrCreateUser = useCallback(async () => {
    let userId = getCookie('userId');
    if (!userId) {
      userId = `temp_${uuidv4()}`;
      setCookie('userId', userId, 365);
    }
    userIdRef.current = userId;
  }, []);

  const updateUserStatus = useCallback(async (_interaction?: InteractionEvent) => {
    // no-op for now; server user upsert happens on collect
  }, []);

  const getOrCreatePageSnapshot = useCallback(async () => {
    // With Prisma backend we create or upsert page on server when collecting.
    // Return null here; we will include page content in the collect POST.
    return null;
  }, []);

  const saveInteractions = useCallback(async () => {
    if (interactionsRef.current.length === 0 || !userIdRef.current) return;

    const interactionsToSave = [...interactionsRef.current];
    interactionsRef.current = [];

    try {
      await fetch('/bridge/api.v1/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userIdRef.current,
          pagePath: window.location.pathname,
          content: document.documentElement.outerHTML,
          siteId: SITE_ID,
          window: { width: window.innerWidth, height: window.innerHeight },
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          ip: geoRef.current?.ip,
          city: geoRef.current?.city,
          region: geoRef.current?.region,
          country: geoRef.current?.country_name,
          latitude: geoRef.current?.latitude,
          longitude: geoRef.current?.longitude,
          events: interactionsToSave,
        }),
      });
    } catch (error) {
      console.error('Failed to save interactions:', error);
      interactionsRef.current.unshift(...interactionsToSave);
    }
  }, []);

  const stopRecordingAndSave = useCallback(() => {
    setIsRecording(false);
    saveInteractions();
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, [saveInteractions]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(
      stopRecordingAndSave,
      MAX_ACTIVE_TIME_MS
    );
  }, [stopRecordingAndSave]);

  const startRecording = useCallback(() => {
    if (isRecording) return;
    setIsRecording(true);
    startTimeRef.current = Date.now();
    resetInactivityTimer();
  }, [isRecording, resetInactivityTimer]);

  const recordEvent = useCallback(
    (eventData: InteractionEventInput) => {
      if (!isRecording) return;
      const event = {
        ...eventData,
        timestamp: Date.now() - startTimeRef.current,
      } as InteractionEvent;
      interactionsRef.current.push(event);
      updateUserStatus(event);
      resetInactivityTimer();
    },
    [isRecording, resetInactivityTimer, updateUserStatus]
  );

  const recordThrottledEvent = useCallback(
    (eventData: InteractionEventInput) => {
      const now = Date.now();
      if (now - lastThrottledEventTimeRef.current > THROTTLE_INTERVAL_MS) {
        lastThrottledEventTimeRef.current = now;
        recordEvent(eventData);
      }
    },
    [recordEvent]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) =>
      recordThrottledEvent({ type: 'mousemove', x: e.clientX, y: e.clientY }),
    [recordThrottledEvent]
  );
  const handleScroll = useCallback(
    () =>
      recordThrottledEvent({
        type: 'scroll',
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      }),
    [recordThrottledEvent]
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      recordEvent({
        type: 'click',
        x: e.clientX,
        y: e.clientY,
        element: getElementSelector(target),
      });
    },
    [recordEvent]
  );

  const handleTouch = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      recordEvent({ type: 'touch', x: touch.clientX, y: touch.clientY });
    },
    [recordEvent]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement && target.type === 'password') {
        return;
      }
      recordEvent({
        type: 'keydown',
        key: e.key,
        element: getElementSelector(target),
      });
    },
    [recordEvent]
  );

  const handleInput = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target.type === 'password') {
        return;
      }
      recordEvent({
        type: 'input',
        value: target.value,
        element: getElementSelector(target),
      });
    },
    [recordEvent]
  );

  useEffect(() => {
    getOrCreateUser();
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        geoRef.current = data;
      })
      .catch(err => console.error("Could not fetch geolocation data", err));
  }, [getOrCreateUser]);

  useEffect(() => {
    const setup = async () => {
      pageIdRef.current = await getOrCreatePageSnapshot();
      if (pageIdRef.current) {
        const eventTypes: (keyof WindowEventMap)[] = [
          'mousemove',
          'click',
          'scroll',
          'keydown',
          'input',
        ];
        eventTypes.forEach((type) => {
          window.addEventListener(type, startRecording, {
            once: true,
            passive: true,
          });
        });
      } else {
        console.error(
          'Could not get or create page snapshot. Recording will not start.'
        );
      }
    };

    const timer = setTimeout(setup, INITIAL_DELAY_MS);

    return () => {
      clearTimeout(timer);
      const eventTypes: (keyof WindowEventMap)[] = [
        'mousemove',
        'click',
        'scroll',
        'keydown',
        'input',
      ];
      eventTypes.forEach((type) => {
        window.removeEventListener(type, startRecording);
      });
    };
  }, [getOrCreatePageSnapshot, startRecording]);

  useEffect(() => {
    if (isRecording) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('scroll', handleScroll, { passive: true });
      document.addEventListener('click', handleClick, {
        capture: true,
        passive: true,
      });
      document.addEventListener('touchstart', handleTouch, { passive: true });
      document.addEventListener('keydown', handleKeyDown, {
        capture: true,
        passive: true,
      });
      document.addEventListener('input', handleInput, {
        capture: true,
        passive: true,
      });
      window.addEventListener('beforeunload', saveInteractions);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick, { capture: true });
      document.removeEventListener('touchstart', handleTouch);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('input', handleInput, { capture: true });
      window.removeEventListener('beforeunload', saveInteractions);
    };
  }, [
    isRecording,
    handleMouseMove,
    handleClick,
    handleScroll,
    handleTouch,
    handleKeyDown,
    handleInput,
    saveInteractions,
  ]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRecording) {
        stopRecordingAndSave();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRecording, stopRecordingAndSave]);
}
