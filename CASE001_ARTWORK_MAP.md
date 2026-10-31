# Case 001 — Artwork Map

All images in this map come from the user-supplied `Gemma story.zip`. The 15 supplied source files are preserved byte-for-byte in the project. No replacement artwork was generated.

## Scenes

| Project asset | Source artwork | Use |
|---|---|---|
| `scenes/sethi-executive-office.png` | Vikram's executive office — crime-scene overview | Case briefing, Meera interview setting, default evidence environment, and case conclusion. Also used for E1, the actual crime-scene overview. |
| `scenes/executive-corridor-cctv.png` | Executive corridor — camera blind spot | Arjun interview; access and facilities timeline reviews. It is a location background, not a fabricated facilities report. |
| `scenes/security-monitoring-room.png` | Security monitoring room | Dev interview and camera maintenance review. |

## Character sprites

These are transparent cutout derivatives made from the exact originals so characters can sit in front of a location background without opaque rectangular backgrounds. The unmodified source images are retained in `source-art/characters/`.

| Project asset | Source artwork | Character / state |
|---|---|---|
| `characters/anika-rao.png` | `Gemini_Generated_Image_xc86njxc86njxc86.png` | Anika Rao, briefing partner |
| `characters/meera-sethi-guarded.png` | `Meera Sethi — guarded.png` | Meera before her concealed argument is exposed |
| `characters/meera-sethi-defensive.png` | `Meera Sethi — defensive.png` | Meera after the argument/call details surface |
| `characters/arjun-malhotra-composed.png` | `Arjun Malhotra — composed.png` | Arjun during his initial controlled interview |
| `characters/arjun-malhotra-cornered.png` | `Arjun Malhotra — cornered.png` | Arjun after corroborating evidence is revealed / canonical reveal |
| `characters/dev-bhatia-nervous.png` | `Dev Bhatia — nervous.png` | Dev before he admits the camera shutdown |
| `characters/dev-bhatia-admitting.png` | `Dev Bhatia — admitting the camera outage.png` | Dev after the manual shutdown admission |
| `characters/vikram-sethi.png` | `Vikram Sethi — victim portrait.png` | Victim identity strip in briefing and reveal |

## Evidence close-ups

Only actual evidence images are attached to evidence records. Where no evidence close-up was supplied, the entry remains text-based; character art and location scenes are not presented as if they were documents.

| Evidence ID | Project asset | Source artwork |
|---|---|---|
| E1 | `scenes/sethi-executive-office.png` | Vikram's executive office — crime-scene overview |
| E2 | `evidence/access-control-record.png` | `Gemini_Generated_Image_em6gbkem6gbkem6g.png` |
| E4 | `evidence/camera-maintenance-record.png` | `Camera maintenance record.png` |
| E5 | `evidence/vendor-payment-ledger.png` | `Vendor payment ledger.png` |
| E7 | `evidence/phone-call-record.png` | `Gemini_Generated_Image_11qm8i11qm8i11qm.png` |

E3 (facilities service record), E6 (Meera's call account), E8 (Vikram's meeting draft), and E9 (forensic time window) do not have supplied evidence close-ups and therefore display their text and metadata without an unrelated image.

## Preserved assets

- `frontend/public/liars-frequency-home.webp` is unchanged.
- All seven files in `frontend/public/cinematic/` are unchanged, including the waking, ringtone, alarm, incoming call, answered call, blinds, and title-card artwork.
- The procedural original noir theme in `CaseOpeningCinematic.tsx` and its menu/game playback logic are retained.
