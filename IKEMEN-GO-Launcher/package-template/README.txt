IKEMEN GO LAUNCHER
==================
Created by Muttley Creations

Build profiles of characters, stages, lifebar and screenpack for IKEMEN GO
without touching the original game files. Similar to VSelect.


INSTALLATION
------------
1. Extract the "IKEMEN-GO-Launcher" folder INSIDE your IKEMEN GO folder,
   next to Ikemen_GO.exe:

      IKEMEN GO\
      ├── Ikemen_GO.exe
      ├── chars\
      ├── data\
      ├── stages\
      └── IKEMEN-GO-Launcher\      <- this folder
          ├── IKEMEN GO Launcher.exe
          ├── Characters\
          ├── Stages\
          ├── Lifebars\
          ├── Screenpacks\
          ├── Previews\
          └── Profiles\

2. Open "IKEMEN GO Launcher.exe". Nothing needs to be installed.

   Do not open the program from inside the .zip: extract the folder first.


REQUIREMENTS
------------
- Windows 10 or 11 (64-bit).
- IKEMEN GO (made and tested for version 1.0).


IF WINDOWS SAYS "Windows protected your PC"
-------------------------------------------
The program has no paid digital signature, so Windows shows this warning
the first time. Click "More info" and then "Run anyway".


IF THE PROGRAM DOES NOT OPEN
----------------------------
It uses Microsoft Edge WebView2, which already comes with Windows 11 and
with an up-to-date Windows 10. If it does not open, install WebView2
(free, from Microsoft):
https://developer.microsoft.com/microsoft-edge/webview2/


HOW TO USE
----------
- Characters, stages, lifebars and screenpacks already in IKEMEN
  (chars\, stages\, data\) show up automatically.
- You can also put new content in the Launcher folders (Characters,
  Stages, Lifebars, Screenpacks). Each folder has a "HOW TO USE.txt".
- Tabs:
    Screenpack - choose the screenpack (and its variant, if any).
    Characters - drag characters onto the grid.
    Order      - arcade order, matches per order and bonus stage.
    Stages     - select the stages of the profile.
    Lifebar    - choose the lifebar.
- Everything is saved automatically in the profile. Click PLAY to start
  IKEMEN GO.


WHAT THE LAUNCHER CHANGES IN THE GAME
-------------------------------------
Nothing in the original files. When you click PLAY it only creates two
files next to the chosen screenpack:
    system.launcher.def
    select.launcher.def
and starts IKEMEN GO with them. If you open Ikemen_GO.exe normally, the
game stays exactly as before.


TIPS
----
- Folder and file names with a comma (,) cannot be used by IKEMEN GO in
  select.def. The Launcher skips them and warns you: rename them.
- A profile without stages may not start a fight. The Launcher asks
  before playing.
- Right-click a character, a grid cell or an extra for more options.
- F5 refreshes the library after you add new content.


UNINSTALL
---------
Delete the IKEMEN-GO-Launcher folder (and, if you want, the
*.launcher.def files created next to the screenpacks).


CREDITS
-------
IKEMEN GO Launcher - Created by Muttley Creations.
IKEMEN GO is made by the Ikemen GO team. This Launcher is an independent,
unofficial tool and is not affiliated with the Ikemen GO project.
Characters, stages, lifebars and screenpacks belong to their authors.
