This project is a simple electronic court allocation dashboard for Tennis club day.

# Techstack
- Next js (static sight)
- Shadcn
- Local storage (maybe superbase later, not for the first cut)
- Prettier
- Eslint
- React testing library (with playwright)


# UI UX

Its to be used on a big screen tv for display and laptop for entry, these are to just use display mirror for the first cut. 

Buttons and text should be big and we are going to match the astetic of the physical white board it is replacing. 

Drag and drop is a must, but button options should exist too.

Use the photos for theme colors: `./physical-board-insperation`


# Deploy

This app will build on github actions and deploy as a git hub page.


# Data model

Court: Id, Name
Player: Id, Name
CourtAllocation: CourtId, PlayerId


# Seed data

Local storage data is merged with seed data on page load (court and player only).  

Seed data is json files.

Pull player names and courts names from photos in: `./physical-board-insperation`

# Screens

Root screen similar to reference white board photos. 

Top section wirh the current time and duty manager (assimable as a player, keeps them in regular player pool) courts (with players and time one court, and next player queue).

Middle sections with players present for the day but not on court.

Bottom section wirh search and other players listeed.

# Flows

## Add players to today

Search and drag or overflow players card to today or a court. Quick add for new players.


## Add and queue players to court 

Drag or players card overflow menu to queue next or assign direct to a court. Game starts once four players are assigned.


## Finish game
Auto assigns next group.


## Move courts
Move a queue group to another court or swap them. Same thing but for assigned too.


## Finish club day
Bottom right of screen. Finish club club day buttons, that clears all allocations and queues.
