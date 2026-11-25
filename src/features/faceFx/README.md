# Face effects

Makes the face on a video look a little better: **Smooth skin**, **Face light**, **Bright eyes** and **Slim face**, each with a
**Strength** (0 to 200%, 100% the usual look), all off by default. Used by the riff Take panel (`devtools/riff/RiffTake.tsx`)
and the content video record page (`contentVideos/ui/RecordVideo.tsx`), under **Face**, apart from the neck readers
(`neckFx`): they run with Read the neck, with the OpenCV reader or with neither. Not while a take records (the model would
compete with the recorder); over the camera before and between takes, and over the take, so a page's **Export with
overlay** records them in the picture.

## How it works

- **The face**: MediaPipe's Face Landmarker (478 points), its runtime and model fetched from jsDelivr and Google storage the
  first time an effect is ticked (`client/load.ts`). It reads each new video frame; the points are eased over frames
  (`easeFace`) and a face is kept 0.3 s after it is lost. The status line (bottom left) says Loading the face model… or
  Face: none; it is empty once a face is seen.
- **The drawing** (`client/faceLook.ts`): the face is cut out of the frame upright (turned by the line between the eyes,
  `model/face.ts`) onto a small canvas, worked on there, and laid back through a soft ellipse round the face, so the hair
  and background stay the original pixels. In order:
  - **Slim face**: each strip of rows moves in toward the middle of the face, most at the jaw (6% of the half width at
    100%), none at the eyes or below the chin; the margin outside the cheeks stretches to fill.
  - **Bright eyes**: the eyes a little brighter, with more contrast and colour.
  - **Smooth skin**: the face blurred and laid back over at part strength, the eyes, brows and lips cut out (grown, so
    their edges stay sharp).
  - **Face light**: the face a little brighter and warmer, feathered to its edge.
- **With other overlays**: `FaceView` has its own canvas, put before the neck overlays so they draw over the face. It copies
  the video's CSS `filter` and `transform` each frame, so the neck effects' Mood light grade and Beat bump apply to the face
  too.

Settings are kept in this browser under `musickit.faceFx`, shared by both pages.

## Files

| File | What |
| --- | --- |
| `model/face.ts` | Pure. The face's upright frame from its landmarks, the contours (oval, eyes, brows, lips), the eased face, Slim face's warp. |
| `model/settings.ts` | Pure. The effects, their words, and the settings read back from storage. |
| `client/load.ts` | Browser. Fetches the face model once. |
| `client/faceLook.ts` | Browser. Draws the effects for one face onto a canvas. |
| `ui/FaceView.tsx` | React. The canvas over a video: reads the face each new frame, draws every animation frame. |
| `ui/FaceControls.tsx` | React. Face: each effect's tick and Strength; `useFace` keeps them. |

Tests: `tsx --test src/features/faceFx/model/*.test.ts` (the cached tsx).
