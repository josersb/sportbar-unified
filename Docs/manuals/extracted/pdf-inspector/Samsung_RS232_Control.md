# Consumer RS232 Control

# Worksheet

### Most Samsung Consumer TVs can be controlled via RS232. Control can

### be through the USB port using a Samsung proprietary dongle or via the

### native 3.5mm ExLink port. Some models are not supported, however.

Some of the Samsung Entry-Level TVs may have chipset limitations that **Overview** prevent complete control from Serial Commands.

### If the Samsung TV has a native 3.5mm ExLink port (currently Q70 and

### above) there are no additional settings that need to be adjusted in the

### TV, just plug and play. Using a model that requires the USB dongle

(8000 or Q60) means a few settings in the TV need to be turned on for control to work.

# Setting up the USB to ExLink Dongle

## 1. With a Samsung IR remote.

2. While the TV is in the Off state hit Mute – 1 – 8 – 2 – Power
## 3. In the Service Menu navigate to Control – Sub Option

## 4. Ensure EXT Link Support and USB Serial options are ON

### TV Setup w/ USB Dongle

5. Once the options are turned on in the service menu, power off the TV for them to be set.
## 6. **Try switching the USB Port if you have any issues with control!


## Consumer RS232 Control

## Worksheet

### Samsung Consumer models will use a string of hex numbers to form a

### command line. These commands are different than those used in the

Commercial models. A full list of the commands can be found at the end of this document.

**08x22x00x00x00x01xD5 (OFF)**

### 08x22 are fixed and The middle 4 are the The last number will be

### will be the same for command. See the Checksum. This is a

every consumer command list at the end calculated number display command. of this document. based on the

### command. See below.

# Calculating a Checksum

### The Checksum is calculated by adding all numbers in the command

### line and subtracting the total from 256 (FF+1). Using the Off Command:

### Command Lines and Check Sum

**Hex** 08 22 00 00 00 01 2B **Decimal** 8 34 0 0 0 1 43

### If we add everything up we get 43 (2B in Hex). We take 256 and

subtract 43 to get 213. Converting that back to Hex gives us D5. There it is, your Checksum is **D5**.

### The 3.5mm pin-out is as follows: out -

### -Tip: Received Data (2) Pin -Ring: Transmitted Data (3)

### -Sleeve: Ground (5) ExLink


# Consumer RS232 Control

# Worksheet

# Check RS232 Via Your Computer.

### Samsung Test App is a great tool for quick and easy testing. You can

### test commands, port activity, USB dongle, checksums, etc.

1. Download the app-SamTvControlLite.zip 2. Connect your computer’s COM Port to the TV’s 3.5mm ExLink port
## 3. Launch the app to start testing!

1. After sending, the 1. Choose the 1. Use either the app should display RS232 Port Select Direct Command or the command line (the PC must be Group Commands and receive a connected) and to control the “success” feedback click “Connect” display – 03 0C F1
### Samsung Serial Control Test App


Up Down TV AV1 AV2 AV3 S-Video1 S-Video2 S-Video3 Component1 Component2 Component3 PC1 PC2 PC3 HDMI1 HDMI2 HDMI3 HDMI4 DVI1 DVI2 DVI3 RVU

0~50

0~100

(-5~+5) Shadow Detail 0~100 0~10 Range changed to 0_30 0-G15, KEY_RIGHT 14-G1, 30-R15

Control Item General Power Power Off On Volume Direct Up Down Mute Ch. Direct

Continuous

Input Source List TV AV

S-Video

Component

PC

HDMI

DVI

RVU Picture Mode Dynamic(Entertain) Standard Movie Natural CAL-NIGHT CAL-DAY BD Wise Relax

Brightness

Contrast

## Shadow Detail

Sharpness Color

## Tint G/R

## Advanced Settings Dynamic Contrast

Gamma Gamma type

## RGB Only Mode

## Color Space

## White Balance

Off Low HIgh -3 ~ 3 HLG ST2084 BT1886

2.2 Off Red Green Blue Auto Native Custom R-Offset G-Offset B-Offset R-Gain G-Gain B-Gain Reset Off On Red Green Blue Yellow Cyan Magenta 0~100 0~100 0~100 50% 75% 100% Low Standard High Off On 0~50 Off On Off On Interval Red Green Blue Reset Off On Interval Red Green Blue Reset
Cmd1 Cmd2 Cmd3 Value 0x00 0x00 0x00 0x00 0x01 0x02 0x01 0x00 0x00 (0~100) 0x01 0x00 0x02 0x00 0x02 0x00 0x00 0x00 0x04 0x00- 0x00 0x01 0x00 0x03 0x02 0x00 0x0a 0x00 0x00 0x00 0x01 0x00 0x01 0x02 0x02 0x00 0x01 0x02 0x03 0x00 0x01 0x02 0x04 0x00 0x01 0x02 0x05 0x00 0x01 0x02 0x03 0x06 0x00 0x01 0x02 0x07 0x00 0x0b 0x00 0x00 0x00 0x01 0x02 0x03 0x04 0x05 0x06 0x07

## 0x01 0x00 (0~50)

## 0x02 0x00 (0~100)

## 0x03 0x00 (-5~+5)

0x04 0x00 (0~100) 0x05 0x00 (0~100)

## 0x06 0x00 (0~30)

0x07 0x01 0x00 0x01 0x03 0x03 (-3~3) 0x04 0x00 0x01 0x02 0x04 0x05 0x00 0x01 0x02 0x03 0x06 0x00 0x01 0x02 0x07 (-50~50) 0x08 (-50~50) 0x09 (-50~50) 0x0a (-50~50) 0x0b (-50~50) 0x0c (-50~50) 0x0d 0x00 0x11 0x00 0x01 0x12 0x00 0x01 0x02 0x03 0x04 0x05 0x13 0~100 0x14 0~100 0x15 0~100 0x1b 0x00 0x01 0x02 0x1c 0x00 0x0b 0xA 0x01 0x02 0x03 0x0b 0x0B 0x00 0x01 0x0C (0~50) 0x0D 0x00 0x01 0x07 0x16 0x00 0x07 0x16 0x01 0x07 0x17 (1~10) 0x07 0x18 (-50~50) 0x07 0x19 (-50~50) 0x07 0x1a (-50~50) 0x00 0x1b 0x00 0x0e 0x16 0x00 0x0e 0x16 0x01 0x0e 0x17 (1~20) 0x0e 0x18 (-50~50) 0x0e 0x19 (-50~50) 0x0e 0x1a (-50~50) 0x0e 0x1b 0x00

Comment Key Map KEY Value KEY_SOURCE 0x01 KEY_POWER 0x02 KEY_SLEEP 0x03 KEY_1 0x04 KEY_2 0x05 KEY_3 0x06 KEY_VOLUP 0x07 KEY_4 0x08 KEY_5 0x09 KEY_6 0x0A KEY_VOLDOWN 0x0B KEY_7 0x0C KEY_8 0x0D KEY_9 0x0E KEY_MUTE 0x0F KEY_CHDOWN 0x10 KEY_0 0x11 KEY_CHUP 0x12 KEY_PRECH 0x13 KEY_GREEN 0x14 KEY_YELLOW 0x15 KEY_BLUE 0x16 KEY_MENU 0x1A KEY_TV 0x1B KEY_INFO 0x1F KEY_MINUS 0x23 KEY_CAPTION 0x25 KEY_TTX_MIX 0x2C KEY_EXIT 0x2D KEY_OK (Enter) 0x2E KEY_FACTORY 0x3B KEY_3SPEED 0x3C KEY_EMANUAL 0x3F KEY_STOP 0x46 KEY_PLAY 0x47 KEY_REC 0x49 KEY_PAUSE 0x4A KEY_TOOLS 0x4B Backlight renamed to KEY_GUIDE 0x4F Brightness KEY_RETURN 0x58 Brightness renamed to KEY_SUBTITLE 0x59

KEY_UP 0x60 KEY_DOWN 0x61

0x62

KEY_LEFT 0x65 KEY_CH_LIST 0x6B KEY_RED 0x6C KEY_HOME(Home) 0x76 KEY_HOME(Smart hub ) 0x79 KEY_TV 0x7D KEY_HDMI 0x8B KEY_POWER 0x98 KEY_PAGE_LEFT 0xA8 KEY_PAGE_RIGHT 0xA9

## Motion Lighting

## Color Space Custom Color

Color Space Custom Red Color Space Custom Green Color Space Custom Blue Color Space Adjustment Point

Color Space Custom Reset Local Dimming

HDR+

## Minimum Brightness

## 10p White Balance

## 20p White Balance

Minimum

## Newly added

## Ambient Light Detection (Eco sensor)


Control Item Picture Option Color Tone Cool Standard Warm1 Warm2 Digital Noise Filter Off Auto HDMI Black Level Normal Low Film Mode Off Auto Auto Motion Plus Off Auto Custom Blur Reduction Judder Reduction LED Clear Motion

## HDMI1 UHD Color Mode

## HDMI2 UHD Color Mode

## HDMI3 UHD Color Mode

## HDMI4 UHD Color Mode

Screen Adjustment Picture Size

## Fit to Screen

Reset Picture Reset Picture Factory-SVB Expert-N/D Adj

Apply Picture Mode All Sources Current Source Pip PIP Off On Antenna Size Position Sound_Select_Main Sound_Select_Sub Channel_Up Channel_Down Sound Sound Mode

Equalizer

Equalizer(7Band)

SRS TruSurround HD Virtual Surrond SRS TruDialog Dialog Clarify Preferred Language

## Multi-Track Sound

## Auto Volume

## Speaker Select

## Sound Select

Sound Reset Auto Stereo

## Audio Delay

## KEY Key Generation

OSD

## Others Art Mode

## Ambient Mode

## HDMI CEC

## Video Player

Standard Music Movie Clear Voice Amplify Optimized Balance 100hz 300hz 1khz 3khz 10khz Reset 100hz 200hz 500hz 1KHz 2KHz 5KHz 10KHz Off On Off On English Spanish French Korean Japanese Mono Stereo SAP Off On TV Speaker External Speaker Audio Out Main Sub Sound Reset Manual Auto

## Dealy Value (0~250)

Off On Off On Off On Off On Off On 16:9 4:3 custom Off On

On Off Fix

Cmd1 Cmd2 Cmd3 Value Comment Key Map 0x0a 0x00 0x00 0x01 0x02 0x03 0x02 0x00 0x04 0x04 0x00 0x01 0x05 0x00 0x02 0x06 0x00 0x02 0x04 0x0b 0x01 value 0x02 value 0x03 0x00 0x01 0x04 0x00 0x01 0x05 0x00 0x01 0x06 0x00 0x01 0x07 0x00 0x01 0x0b 0x0a 0x01 0x00 0x04 0x0B 0x0d 0x02 0x00 0x01 0x0b 0x0b 0x00 0x00 0x0b 0x0d 0x00 0x00 0x01 0x02 0xb 0x0e 0x00 0x00 0x01 0x0b 0x08 0x00 0x00 0x01 0x01 0xff 0x02 0xff 0x03 0xff 0x04 0x00 0x01 0x05 0x00 0x01 0x0c 0x00 0x00 0x01 0x02 0x03 Updated 0x04 0x05 0x06 0x01 0x00 (0~20) 0x01 (0~20) 0x02 (0~20) 0x03 (0~20) 0x04 (0~20) 0x05 (0~20) 0x06 0x00 0x07 (0~20) 0x08 (0~20) 0x09 (0~20) 0x0A (0~20) 0x0B (0~20) 0x0C (0~20) 0x0D (0~20) 0x02 0x00 0x00 0x01 0x03 0x00 0x00 0x01 0x04 0x00 0x00 0x01 0x02 0x03 0x04 0x05 0x00 0x00 0x01 0x02 0x06 0x00 0x00 0x01 0x07 0x00 0x00 0x01 Not supported 0x01 0x08 0x00 0x00 0x01 0x09 0x00 0x00 0x0b 0x00 0x00 0x00 0x01

0x0d 0x00 (0~250) Not supported in SERO TV

Refer key 0x0d 0x00 0x00 map

## 0x0e 0x01 0x00 0x00

0x01 0x0b 0x0b 0x0e 0x00 0x01 0x0b 0x0b 0x10 0x00 0x01 0x0b 0x0b 0x0f 0x00 0x01 0x0e 0x02 0x00 0x02 Steps: 0x0e 0x02 0x00 0x03 1. Copy multiple mp4 files in pen drive. 0x0e 0x02 0x00 0x04 2. Rename them to 1.mp4, 2.mp4 and so on. 0x0e 0x02 0x01 (0~255) 3. Insert pen drive in board. 0x0e 0x02 0x02 0x00 4. Send command 0x0e 0x02 0x02 0x01 0x0E 0x02 0x03 0x01(for 1.mp4).

1.mp4 file will be played.
0x0e 0x02 0x03 (0~255) To play 2.mp4 file, give command 0x0E 0x02 0x03 0x02

Enable OFF ON OFF ON OFF ON Pause Resume Stop Seek UI Off UI On

Player On UI Off ( 0 - 255)

## Enable/Disable Cmd Result OSD Disable
