import cv2
import mediapipe as mp
import math
import pyautogui

pyautogui.FAILSAFE = True

# ── MediaPipe ──────────────────────────────────────────────────────────────────
mp_hands_mod   = mp.solutions.hands
hand_detector  = mp_hands_mod.Hands(
    max_num_hands=2,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7,
)

# ── Camera ─────────────────────────────────────────────────────────────────────
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("❌ Camera failed")
    exit()

screen_w, screen_h = pyautogui.size()

# ── Constants ──────────────────────────────────────────────────────────────────
PINCH_THRESHOLD = 40    # px — thumb+index distance to count as pinch
CURSOR_ALPHA    = 0.3   # EMA smoothing for cursor movement
ZOOM_ALPHA      = 0.15  # EMA smoothing for zoom distance (lower = smoother)
ZOOM_STEP       = 25    # px of inter-hand distance change per zoom hotkey step
DRAG_FRAMES     = 4     # frames held before pinch becomes a drag

# ── Cursor state ───────────────────────────────────────────────────────────────
smooth_cx, smooth_cy = screen_w // 2, screen_h // 2
pinching     = False
pinch_frames = 0
is_drag      = False

# ── Zoom state ─────────────────────────────────────────────────────────────────
zoom_state = {
    "active":      False,   # True once both hands first pinch together
    "ref_dist":    0.0,     # inter-hand distance when zoom gesture began
    "smooth_dist": None,    # EMA-smoothed current distance
    "last_level":  0,       # last integer zoom level sent
}


# ── Functions ──────────────────────────────────────────────────────────────────

def landmark_px(lm, w, h):
    """Normalize → pixel coords."""
    return int(lm.x * w), int(lm.y * h)


def get_pinch(hand, w, h):
    """
    Returns:
        center      (cx, cy) — midpoint of thumb + index tips
        is_pinching bool
        thumb_pt    (tx, ty)
        index_pt    (ix, iy)
    """
    thumb  = landmark_px(hand.landmark[4], w, h)
    index  = landmark_px(hand.landmark[8], w, h)
    dist   = math.hypot(thumb[0] - index[0], thumb[1] - index[1])
    center = ((thumb[0] + index[0]) // 2, (thumb[1] + index[1]) // 2)
    return center, dist < PINCH_THRESHOLD, thumb, index


def draw_hand(frame, thumb, index, center, is_pinching):
    dot_color = (0, 140, 255) if is_pinching else (0, 255, 0)
    cv2.circle(frame, thumb,  6, (0, 0, 255),  -1)   # thumb  = red
    cv2.circle(frame, index,  6, dot_color,    -1)   # index  = green / orange
    cv2.circle(frame, center, 5, (255, 255, 0), -1)  # center = yellow


def ema(value, prev, alpha):
    return alpha * value + (1.0 - alpha) * prev


def move_cursor(cx, cy, w, h):
    """Map camera point → screen coords with EMA smoothing, then move mouse."""
    global smooth_cx, smooth_cy
    tx = int(cx / w * screen_w)
    ty = int(cy / h * screen_h)
    smooth_cx = int(ema(tx, smooth_cx, CURSOR_ALPHA))
    smooth_cy = int(ema(ty, smooth_cy, CURSOR_ALPHA))
    pyautogui.moveTo(smooth_cx, smooth_cy)


def handle_click_drag(pinch_now):
    """
    Click/drag state machine for the cursor hand.
    - First frame of pinch → instant click
    - Held ≥ DRAG_FRAMES → mouseDown (drag)
    - Release → mouseUp if dragging
    Returns overlay label string or None.
    """
    global pinching, pinch_frames, is_drag

    if pinch_now and not pinching:
        pyautogui.click()
        pinching     = True
        pinch_frames = 1
    elif pinch_now and pinching:
        pinch_frames += 1
        if pinch_frames >= DRAG_FRAMES and not is_drag:
            pyautogui.mouseDown()
            is_drag = True
    elif not pinch_now and pinching:
        if is_drag:
            pyautogui.mouseUp()
            is_drag = False
        pinching     = False
        pinch_frames = 0

    if is_drag:   return "DRAG"
    if pinching:  return "CLICK..."
    return None


def release_drag():
    """Safety release — call whenever hand tracking is lost or zoom takes over."""
    global pinching, pinch_frames, is_drag
    if is_drag:
        pyautogui.mouseUp()
        is_drag = False
    pinching     = False
    pinch_frames = 0


def reset_zoom():
    """Clear zoom state when either hand stops pinching."""
    zoom_state["active"]      = False
    zoom_state["smooth_dist"] = None


def update_zoom(center0, center1):
    """
    Both hands are pinching. Compute inter-hand distance, smooth it,
    compare to the reference distance set at zoom-gesture start, and
    fire Cmd+= / Cmd+- for each ZOOM_STEP crossed.
    Returns overlay label or None.
    """
    dist = math.hypot(
        center0[0] - center1[0],
        center0[1] - center1[1],
    )

    # Smooth
    if zoom_state["smooth_dist"] is None:
        zoom_state["smooth_dist"] = dist
    else:
        zoom_state["smooth_dist"] = ema(dist, zoom_state["smooth_dist"], ZOOM_ALPHA)

    smoothed = zoom_state["smooth_dist"]

    # Lock reference on first frame of the gesture (zoom_active flag)
    if not zoom_state["active"]:
        zoom_state["ref_dist"]   = smoothed
        zoom_state["last_level"] = 0
        zoom_state["active"]     = True

    # Integer zoom level relative to reference (truncate to avoid boundary jitter)
    level = int((smoothed - zoom_state["ref_dist"]) / ZOOM_STEP)
    steps = level - zoom_state["last_level"]

    label = None
    if steps > 0:
        for _ in range(min(steps, 3)):      # cap at 3 per frame
            pyautogui.hotkey("command", "=")
        label = "ZOOM IN"
    elif steps < 0:
        for _ in range(min(-steps, 3)):
            pyautogui.hotkey("command", "-")
        label = "ZOOM OUT"

    zoom_state["last_level"] = level
    return label or ("ZOOM IN" if level > 0 else "ZOOM OUT" if level < 0 else "ZOOM ACTIVE")


# ── Main loop ──────────────────────────────────────────────────────────────────
while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape

    rgb       = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_result = hand_detector.process(rgb)
    detected  = mp_result.multi_hand_landmarks or []
    label     = None

    if len(detected) == 1:
        center0, pinch0, thumb0, index0 = get_pinch(detected[0], w, h)
        draw_hand(frame, thumb0, index0, center0, pinch0)
        move_cursor(*center0, w, h)
        label = handle_click_drag(pinch0)
        if zoom_state["active"]:
            reset_zoom()

    elif len(detected) == 2:
        center0, pinch0, thumb0, index0 = get_pinch(detected[0], w, h)
        center1, pinch1, thumb1, index1 = get_pinch(detected[1], w, h)

        draw_hand(frame, thumb0, index0, center0, pinch0)
        draw_hand(frame, thumb1, index1, center1, pinch1)

        # Cursor always follows hand 0
        move_cursor(*center0, w, h)

        if pinch0 and pinch1:
            # Both pinching → zoom mode; drop any in-progress cursor drag
            if pinching:
                release_drag()
            cv2.line(frame, center0, center1, (200, 200, 200), 1)
            label = update_zoom(center0, center1)
        else:
            # At least one hand open → reset zoom, normal cursor on hand 0
            if zoom_state["active"]:
                reset_zoom()
            label = handle_click_drag(pinch0)

    else:
        # No hands detected — safety cleanup
        if pinching:
            release_drag()
        if zoom_state["active"]:
            reset_zoom()

    # ── Overlay ────────────────────────────────────────────────────────────────
    if label and "ZOOM" in label:
        ov_color = (0, 165, 255)
    elif label == "DRAG":
        ov_color = (0, 60, 255)
    elif label == "CLICK...":
        ov_color = (0, 200, 255)
    else:
        label    = "OPEN  (move)"
        ov_color = (0, 255, 0)

    cv2.putText(frame, label, (10, 35),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, ov_color, 2)
    cv2.putText(frame, "ESC to quit | corner to abort",
                (10, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 180, 180), 1)

    cv2.imshow("Hand Gesture Mouse Control", frame)
    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
