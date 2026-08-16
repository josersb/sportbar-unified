# User Manual for DigitaLinxIP 5000 Series System

Rev 220622Toll-Free: 800-530-8998 Fax: 719-260-0075 supportlibav@libav.com

Arranger Digi IP 5000 User Manual

## Table of Contents

***Status ... ***5
*Device Stats ... *5
*Groups ... *8
*Streams and Subscriptions ... *9
*Encoder ... 9*
*Decoder ... 10*
*Device Settings Access ... *11
*On-Screen Decoder Identify ... *11
*Export Device Info ... *12
*Export All Device Info ... *12
*Health Check ... *13
***Device Settings ... ***14
*Edit Settings ... *14
*Device Name ... *15
*Device Groups ... *16
*Network ... *17
*HDMI Input (Encoder) ... *18
*HDMI Output (Decoder) ... *20
*Audio Output (Encoder) ... *22
*Audio Output (Decoder) ... *23
*RS232 Serial ... *24
*Display Control (Decoder Only) ... *26
*Idle Image (Decoder Only) ... *28
*Export Settings ... *29
*Import Settings ... *30
***Matrix ... ***31
*Video / Audio ... *31
*Serial ... *32
*Infrared ... *33
*USB ... *33
***Video Wall ... ***34
***Tools ... ***36
*Send Serial ... *36
*Control Commands ... *37
*Reboot Device ... *38
*Reset Device ... *39
*Update Device Firmware ... *40
*Preview ... *41

***Global Cache Assistant ... ***43
Sending Serial Signals ... 43
Sending IR Signals ... 50
Controlling Contact Closures ... 56
Controlling Relays ... 61
Configuring Sensor and Contact Closure Triggers 68
***Global Settings ... ***74
*Users ... *74
*Add User ... *75
*Edit User ... *76
*Delete User ... *77
*Active Users ... *78
*Groups ... *79
*Add Group ... *80
*Edit Group ... *81
*Delete Group ... *82
*Multicast ... *83
*Permissions ... *84
*Security Keys ... *86
*HTTP API Security Key ... *86
*TCP Security Key ... *88
*Analytics ... *91

*Source Availability ... *92

*Display Availability ... *93

*Source Resolution ... *94

*Source Count ... *95

*Display Count ... *96
*Display Source Change ... *97
*Network Downtime ... *98
*UI Creator ... *99
*Notifications ... *100
*Email Settings ... *101
*Presets ... *102
*Make a New Preset ... *103
*Edit a Preset ... *104
*Delete a Preset ... *105
*Apply a Preset ... *106
*Export a Preset ... *107
*Export ALL Presets ... *108
*Import a Preset ... *109
*Import ALL Presets ... *110
*QR Code Preset ... *111
*Scheduler ... *

*Table of Contents continued ... *
*Events ... *115
*UI Creator ... *117
*Create a New User Interface ... *117
*Edit a User Interface ... *118
*UI Modes ... *120
*Standard Mode ... *121
*QR Code Result Mode ... *122
*Adding Labels ... *123
*Adding Buttons ... *125
*Button Logic ... *130
*Button Logic-Momentary ... *131
*Button Logic-Toggle ... *132
*Button Logic-Radio Toggle ... *133
*Button Logic-Split ... *134
*Button Logic-Repeat ... *137
*Button Logic-QR Code ... *138
*Adding an Image ... *139
*Copying and Pasting Elements ... *142
*Adding a Background ... *144
*Duplicate a User Interface ... *146
*Delete a User Interface ... *147
*Generating a Local UI QR Code and URL ... *148
*Generating a Remote UI QR Code and URL ... *149
*Exporting / Importing User Interface ... *150
***System / Controller Settings ... ***152
*Network Settings ... *153
Single Network Mode ... 153
Dual Network Mode ... 154
*Advanced Settings ... *155
*Export Settings ... *157
*Import Settings ... *158
*System Clock ... *159
*System Reboot ... *160
*System Logs ... *161
*License ... *162
*Software Version ... *163
*Check for Updates ... *164
*Import Updates ... *165
***Security Features ... ***166
***How to HTTP Request ... ***167
*Example 1 - POST-ajax ... *167
*Example 2 - POST-xhr ... *168
***Preset Logic ... ***169
***Using Google Assistant ... ***
***Using Command Assistant ... ***

### Status

The *Status* tab contains information about how an encoder or decoder is currently functioning. By default this is the first screen you will see when logging onto the Arranger server application.

#### Device Stats

Arranger will detect all Digi IP devices on the AV LAN and will display all the current and up-to-date stats for each encoder and decoder by default. To expand individual information on a device, click on the *EXPAND* button on the desired encoder or decoder.

#### Device Stats continued ... 

The expanded menu provides up-to-date information on the device such as alias / device name, group name, IP address, MAC address, streaming status, firmware version, resolution/format type, and video quality and will also show a preview of the video feed being ingested (encoder) or routed (decoder).

Expanded menu also provides quick access to device streams / subscriptions, access to deeper device settings, export details for device via JSON formatted string and identify decoder locations on screen to a connected display.

Below is an expanded menu for an encoder; the legend below explains the ***status*** icons shown in the menu.

***Note:*** Device video previews are

turned OFF by default.

See *Device Settings > HDMI Input* of this manual for more info on turning on preview.

***Status*** icons are used to visually indicate the status of a device as follows:

```
Encoder with video source connected
Decoder with monitor / display connected
Encoder / decoder is connected to the network; no source or
display connected
Encoder / decoder is disconnected from the network
Encoder / decoder has a network issue and has timed out
Device has an error
```

#### Device Stats continued ... 

To display all details for ALL devices, click the up/down arrow button as shown below

***Groups*** Encoders and decoders can be filtered by groups to limit the number of devices being displayed.

To filter by group, select the group from the drop-down menu below. When a group is selected only the devices in that group will be edited by the various menus.

***Note:*** By default all encoders and decoders are grouped in the *UNGROUPED* category, when devices are

sectioned into user-defined groups this file will eventually be empty and cannot be deleted as it is default file for new devices found on a network. The *ALL DEVICES* selection will select all devices regardless of what group they may be associated with.

To learn how to set up devices in a group, see *Global Settings > Groups*

#### Streams and Subscriptions

*Details* option under the encoder / decoder contains information regarding the streams and subscriptions to those streams.

**Encoder** The *Streams* tab of an encoder will show the status of all streams along with their multicast address. From here you can stop or start all streams.

#### Streams and Subscriptions continued ... 

**Decoder** The *Subscriptions* tab of a decoder will show what multicast address is being used to receive data. It will also indicate from what encoder it is receiving the streams.

From here you can leave any of the streams.

#### Device Settings Access

Clicking the *Settings* button on a device will send you directly to the device settings tab so device settings can be changed quickly. To learn more about settings, see *Device Settings*

#### On-Screen Decoder Identify

*Identify* button in device details on a decoder allows you to display the decoder's name on the connected display or monitor. Device name will be displayed on screen for 30 seconds.

#### Export Device Info

A JSON formatted file will export the complete status of the selected device. This is to be used for system diagnostics. A *.ini file with the device name will be saved to your downloads folder on your PC.

#### Export All Device Info

*Export Status Report* will save a csv formatted file with all the status details from this section.

#### Health Check

*Group Health* will report the up-to-date status of all the encoders and decoders in the selected group. If a group has a default preset associated with it, this can also be selected and applied to make sure there are no issues before the system is put into use.

### Device Settings

This is where all the encoder and decoder device settings are configured in the system. encoders and decoders can be individually configured or configured in batches to save time for setting up standardized equipment.

For settings that can be applied to all encoders or decoders, the option is given to update ALL or you can select which devices to apply the global setting to. If there is no *apply to all* or *group apply* option given then that is a specific setting for that device; for instance you cannot name all decoders the same name so that is not an option to apply to all or multiple selected devices.

Device settings can also be exported to the csv formatted data and manipulating it as required before importing it back into the system. All changes made in the DeviceExport.csv configuration file will be applied to the encoders and decoders.

#### Edit Settings

Here you can change the device settings for encoders and decoders on the system.

**1** **2** **3** **4**

1. *Select* allows you to filter out devices by groups or you can select ALL devices.
2. Select *Edit* from *Device Settings*.
3. Select *Device Type* to filter between encoder and decoder type.
4. Select a *Device.*

#### Device Name

The name of a device is used for control purposes. This is the device name used in API commands. Device and alias names have a maximum of 19 characters and no spaces are allowed.

**1** **2** **4 3**

1. Enter *Name.*
2. Enter *Alias.*
3. Tick *Update Alias* to update the alias name of the device.
4. Click *Save* or *Default* to return to factory default name of device. ***NOTE:*** The following device names cannot be used: ‘all’ ‘all_rx’ ‘all_tx’ ‘ungrouped’ ‘all_devices’ Any Group name Any Preset name

#### Device Groups

Encoders and decoders can be assigned to groups. These groups are created from the *Global Settings* tab. Once an encoder or decoder has been placed in a group, an alias name and an icon can be assigned to it. This alias name and icon will then be used on the *Matrix* tab / page once a group is selected.

Group names have a maximum of 19 characters and no spaces are allowed.

**1** **3** **2**

1. Assign device to *Group* by ticking the desired box; in this example we have built two groups; Group 1 and Group 2. To learn how to build *Groups* see *Global Settings > Groups.*
2. Select an appropriate icon.
3. Click *Clear* to clear selection or click *Save.*

***Network*** Click on *Network* to change network settings for device(s).

**1**

**2**

1. Select *IP mode*; AUTO, MANUAL or DEFAULT
- AUTO-DHCP, this mode will allow the IP address to be set automatically by a third-party router or DHCP server.
- MANUAL-Static address mode, enter in user-specified IP address, subnet and gateway.
- DEFAULT-resets to factory default, device will be set to 169.254.0.0/16 Network ID range.
2. Click *Save* to save individual device settings. OR Click *Save to Devices* to apply this setting to multiple devices.
***Note:*** Only *MANUAL* and *DEFAULT* mode will save multiple devices.

|HDMI Input (Encoder) Click HDMI Input|Arranger Digi IP 5000 User Manual to adjust settings to the video input of an encoder. Here you can enable / disable the devices preview stream, decide video quality and set EDID table to HDMI input.|
|---|---|
||1 2 3 4 5 6|
|18||

#### HDMI Input (Encoder) In continued ... 

1. Select enable / disable option in *Preview* drop-down menu, by default all previews are set to *DISABLED.*
2. Select *Video Quality* setting by selecting quality rating 0 - 5, 0 with 5 being the best quality.
***Note:*** This option applies more compression to further decrease the variable bit rate.

3. Select a desired EDID table to the HDMI input, by default EDID is set to 4K 2 channel audio with HDR. Below is a list of all EDID options in the EDID drop-down menu.
- 4K 2ch, 6ch, 8ch audio with and without HDR10
- 1080p 2ch, 6ch, 8ch audio
- 1920 x 1200 2 ch audio
- Copy and apply EDID from a display or another device connected to a decoder.
4. Click on *External File* to load an external EDID file (must be .edid format).
5. Click *Save* to save individual device settings. OR Click *Save to Devices* to apply this setting to multiple devices.
6. Click *Save EDID to file* as an external .edid formatted file; click *Copy to Clipboard* to copy the current displayed EDID file characters.

#### HDMI Output (Decoder)

Click *HDMI Output* to adjust settings to the video output of a decoder.

**1**

**2** **3** **4** **5** **5a** **5b** **6**

**7**

**6**

#### HDMI Output (Decoder) continued ... 

1. Display Preview.
2. Select output *Resolution.*
3. Select *HDCP.*
4. Enable / Disable *Video Mute.*
5. Enable / Disable *Video Loss.* 5a. Select *Video Timeout.* 5b. Select *Enable/Disable* to black the display.
6. Select display *Rotation.* 6a. Select *Aspect Ratio.*
6. Click *Save* to save individual device settings. OR Click *Save to Devices* to apply this setting to multiple decoders.

#### Audio Output (Encoder)

Click on the *Audio Output* menu to configure the 3.5mm analog audio output jack of an encoder. By default the audio output is set to HDMI embedded audio, 2 channel only.

**1** **2** **3**

1. Select *Audio Source*; AUTO, HDMI or ANALOG.
- AUTO-Will automatically switch between the analog audio input on the encoder and the HDMI 2 channel embedded audio.
- HDMI-Sets audio output to HDMI 2 channel embedded audio.
- ANALOG-Sets 3.5mm audio input on encoder as the default output.
2. Set the *Analog Audio Output Volume.*
3. Click *Save* to save individual device settings. OR Click *Save to Devices* to apply this setting to multiple encoders.

#### Audio Output (Decoder)

The 3.5mm analog audio output jack of a decoder is an output of embedded HDMI audio. The analog output level can be adjusted here.

**1** **2**

1. Set desired level for the *Analog Audio Output Volume.*
2. Click *Save* to save individual device settings. OR Click *Save to Devices* to apply this setting to multiple decoders.

|RS232 Serial|Arranger Digi IP 5000 User Manual Here you configure the parameters for the serial RS232 port of a device so third-party devices using RS232 can be controlled with Arranger.|
|---|---|
||1 2 3 4 5 6 7|
|24||

#### RS232 Serial continued...

***Note:*** If you are setting up the RS232 serial port to control a third-party device, be sure the RS232 settings

match that of the controllable device.

1. Select *Baud Rate.*
2. Select *Data Bits.*
3. Select *Stop Bits.*
4. Select *Parity.*
5. Select *Mode*; MATRIX or CONTROL.
- MATRIX-Device will appear in the serial *Matrix* menu and can be routed.
- CONTROL-Device will not appear in the *Matrix* menu and can be used to send and receive from external serial peripherals.
6. Select Feedback Timeout. *Feedback Timeout* is an encoder-only setting in *MATRIX* mode. The *Timeout* sets the time an encoder will only respond to the decoder sending data and not broadcast to all connected decoders. After the timeout an encoder's data is sent to all connected decoders.
7. Click *Save* to save individual device settings. OR Click *Save to Devices* to apply this setting to multiple encoders or decoders.

#### Display Control (Decoder Only)

Here you can turn the display's power ON or OFF with CEC or RS232.

With CEC selected and a compatible display the power can be switched with no other commands.

**1** **2**

1. Click *Save* to save individual device settings. OR Click *Save to Devices* to apply this setting to multiple decoders.
2. Press ON to power display ON; press OFF to power display OFF.

#### Display Control (Decoder Only) continued...

With RS232 selected and a compatible display the power can be switched with ASCII or HEX commands depending on the serial port setting applied.

Enter a command for *ON Command* and *OFF Command,* then save. Now the power buttons are functional.

**1** **2**

1. Click *Save* to save individual device settings. OR Click *Save to Devices* to apply this setting to multiple decoders.
2. Press ON to power display ON, press OFF to power display OFF.

#### Idle Image (Decoder Only)

Here is where you can change the default splash screen shown when no video is displayed.

The format of the image must be jpg with a resolution of 1280x720 and a maximum size of 1.5MB.

**1** **2**

1. *Select File* from local folder on your PC to upload to decoder.
2. Click *Upload* to upload file into individual device. OR Click *Upload to All* to apply this setting to multiple decoders.

#### Export Settings

The current settings of all the encoders and decoders can be exported to a csv formatted file to be used as a configuration backup or be used to reconfigure the encoders and decoders by changing the required data and importing it back into the Arranger controller.

A file named “DeviceExport.csv” will be exported to your downloads folder.

**1** **2**

1. Select *Export* option in *Device Settings* drop-down menu.
2. Click *Export Settings.*

#### Import Settings

The exported device settings file can be imported back into the system from here. Any device configuration changes made to the DeviceExport.csv will be applied once the file has been imported. This may take some time depending on the amount of configuration changes that need to be performed.

**1** **2**

1. Select *Import* option in *Device Settings* drop-down menu.
2. Click *Import Settings.*

### Matrix

The *Matrix* tab contains up to 5 individual matrix tabs for each of the signal types; video, audio, serial, infrared and USB. Here you can create or stop joins between encoders and decoders.

Click a white square to make a join. Click a blue square to remove a join.

Click *ALL* square to make a join from an encoder to ALL decoders.

#### Video / Audio

Here the video and audio are combined so they are both joined to the destination device.

The scaled video resolution of a decoder's HDMI output can also be changed by clicking the individual decoder settings buttons.

#### Video / Audio continued ... 

When independent routing of the video and audio is required select the *Separate Audio Routing* checkbox. Now the video and audio will appear in separate independent matrix tabs.`

***Serial*** The matrix *Serial* tab is intended for making serial joins between encoders and decoders for devices set to serial *MATRIX* mode. Devices set to *CONTROL* mode will not been seen in the matrix. To change serial modes see *Devices Settings > RS232 Serial*.

***Infrared*** The matrix Infrared tab is intended for making infrared joins between encoders and decoders.`

***USB*** The matrix USB tab is intended for making USB joins between encoders and decoders.

The matrix has a KVM (keyboard video mouse) checkbox that will control USB along with video/audio routing.

### Video Wall

In the *Video Wall* tab, multiple decoders can be grouped together to form a video wall. Each display requires a decoder and at least one encoder source is required. In a view wall configuration, the decoder’s frame buffer is now locked with multiple frame buffers of other decoders. All the decoders working in tandem are receiving the same video stream. Each decoder crops the feed according to relative position within the video wall array and then scaled to a specified resolution.

Here decoders can be assigned to a video layout and an encoder can be routed to the joined video wall. You can also adjust parameters such as resolution and bezel control.

```
1
2
3
4 11
5
6
7
8
9
10
12
13
```
1. Select the group of encoders and decoders to be used in configuration.
2. Select mode (only *Standard* is available for now).
3. Select the video wall layout up to 8 x 5.
4. Select the source encoder for the video to be displayed in the layout.
5. Select the resolution of the displays. The cropped video area from the original source content will be scaled to a display resolution. So if the cropped area is only 960x540, in this case it will be scaled to 1920x1080 for the display.
6. Select *Bezel Compensation* to automatically compensate for the bezel widths.

#### Video Wall continued...

7. Enter total display width in millimeters (mm).
8. Enter display's viewable screen width in millimeters (mm).
9. Enter total display height in millimeters (mm).
10. Enter display's viewable screen height in millimeters (mm).
11. Drag and drop displays into desired video wall quadrants.
12. Drag and drop encoder to video wall to display video source.
13. Click *Apply* to apply current video wall configuration, click *Save Preset* to save as a recallable preset or click *Load Preset* to load an existing video wall preset. When clicking on *Load Preset* a pop- up window will open with a list of your current video wall presets.

### Tools

The *Tools* tab contains many utilities to assist in the installation and updating process.

#### Send Serial

The *Send Serial* tab is used to test serial strings being sent from an encoder or decoder to third-party peripheral devices such as projectors. The Receive mode will indicate the feedback format of the selected device(s).

**1**

**2** **3** **4** **5**

1. Select device(s) from the group drop-down menu and select the appropriate devices(s).
2. Select either *ASCII* or *HEX* as the input format of the string.
3. Enter the desired data string.
4. Select <CR> and/or <LF> terminator if required.
5. Click *Send.*

#### Control Commands

The *Control Command* is used to send any of the API commands available to the system for testing purposes.

**1** **2**

**3**

1. Select a command from the *Select Control Command* drop-down menu.
***Note:*** Click on the *View Command Manual* link next to the ? for system command definitions.

*2. Assistant* is a command wizard that will allow you to easily input the information required for the command in order to render the finished code correctly. Use *Assistant* to configure the command or change the parameters manually in the *Data String* field surrounded with "<" & ">"
3. Click *Send.*

#### Reboot Device

The *Reboot Device* tab is used to reboot the selected device(s).

**1**

**2**

1. Select device(s) from the group drop-down menu and select the appropriate devices(s).
2. Click *Reboot.*

#### Reset Device

The *Reset Device* tab is used to reset the selected device(s) back to factory defaults.

**1**

**2**

1. Select device(s) from the group drop-down menu and select the appropriate devices(s).
2. Click *Reset.*

#### Update Device Firmware

The *Update Device Firmware* tab is used to update the encoders and decoders.

***Note:*** An Internet connection is required to obtain the latest firmware update available.

**1**

**2**

1. Select device(s) from the group drop-down menu and select the appropriate devices(s) to be updated from the firmware options available.
2. Click *Update Firmware.*

***Preview*** The preview tab is used to view the preview stream of all encoders. The Preview Available checkbox can be selected to only display encoders with a video source / preview stream available.

### Global Cache Assistant

The *Global Cache Assistant* tab is used to configure and communicate with Global Cache endpoints to communicate with third-party devices over a network via serial, infrared (IR), contact closures, and relays using the API control command ***send gc.***

#### Sending Serial Signals

The following wired and wireless Global Cache devices can be used to send serial signals to 3rd party devices from Arranger.

iTach Flex PoE iTach Flex WiFi PN: FLEXIP-IP PN: FLEXIP-IP

The following Global Cache accessories can be used on all devices listed above for serial endpoint communication.

#### FLC-SL-232 FLC-SL-485 FLC-SL-MJ

#### Sending Serial Signals continued ... 

The following wired Global Cache devices can be used to send serial signals to 3rd party devices from Arranger and does not require proprietary cabling for serial / RS232 connections.

iTach Ethernet to Serial iTach Ethernet to Serial iTach Ethernet to Serial PN: IP2SL PN: IP2SL-P (PoE) PN: WF2SL (WiFi)

#### GC-100 Products

- GC-100-06
- GC-100-12
- GC-100-18
- GC-100-18R

#### Sending Serial Signals continued ... 

In this example we will configure the iTach IP2SL TCP/IP to serial endpoint which will allow us to send a serial command string to a third-party device connected to the IP2SL via DB9 / RS232 connection.

In order to communicate with a 3rd party device, gather device details for the serial connection of the device,

i.e. baud rate, parity, stop bits and ASCII control commands that you wan to use. This unit will not generate those commands or settings for you automatically. ***NOTE:*** The Global Cache *Assistant* is also used in the *PRESETS* menu so you can save the generated strings for future use
**1**

1. To identify Global Cache devices on your network, click *Device Discovery*; this will search for the Global Cache devices and will return a list like below.

#### Sending Serial Signals continued ... 

2. After initial discovery of Global Cache devices click on the iTachIP2SL in the menu below. Click on the desired Global Cache device to configure.
**2**

#### Sending Serial Signals continued ... 

The following menus appear after the iTach device is selected. This menu is referred to as *Wizard mode*; to enter information in manually select *Normal* as the *Select Mode* option.

**1** **3** **2**

1. The *Wizard* menu provides access to configure the device to send serial strings.
2. The *Config Page* will direct you to the Global Caches internal web server; this will pop-up in another browser menu.
3. Apply an alias name and description of the device and click *Save* so the device can be accessed more quickly in the future, otherwise you will need to discover the device again. These named devices will appear via drop-down above the *Device Discovery* menu.

#### Sending Serial Signals continued ... 

The following appears after the *Wizard* menu is selected in the previous step. Here we will configure the serial command to send.

**1 2** **3** **4** **5** **6** **7** **8**

**9**

**10**

1. *Network* option allows you to update the Global Caches devices network settings; by default the IP2SL is set to DHCP and falls back on APIPA 169.254.0.0/16 Network ID in absence of a DHCP server / router.
2. *Serial* option allows you to update the serial communication parameters of the device i.e. baud rate.
3. Apply an *alias name* and *description* of the device and click *Save* so the device can be accessed more quickly in the future otherwise you will need to discover the device again. These named devices will appear via drop-down above the *Device Discovery* menu.

#### Sending Serial Signals continued ... 

4. Enter in the serial string you would like to transmit (see 3rd party device documentation for commands)
5. Add terminator <CR> and/or <LF> if required.
6. Enter desired *Feedback* (optional).
7. Once all the above parameters are entered click *Set*; this will format the entered command in the *Global Cache Command* field automatically for use.
8. Select port and disconnect if required (optional).
9. Once the information above has been entered in click *Finish.*
10. Click *Send* to test the code. You can now use this generated command in a preset to be used with UI control, scheduling and automation OR send this command from a 3rd party control system to the Arranger controller to activate the current configuration. Arranger controller listens on TCP port 6980.

#### Sending IR Signals

The following wired and wireless Global Cache devices can be used to send IR signals to 3rd party devices from Arranger.

iTach Flex PoE iTach Flex WiFi PN: FLEXIP-IP PN: FLEXIP-IP

The following Global Cache accessories can be used on all devices listed above for IR endpoint communication.

#### FLC-1E FLC-3E FLC-SL-MJ

#### FLC-BL FLC-T3

#### Sending IR Signals continued ... 

The following wired Global Cache devices can be used to send IR signals to 3rd party devices from Arranger.

iTach WiFi to IR iTach Ethernet to IR iTach Ethernet to IR PN: WF2IR PN: IP2SL-P (PoE) PN: IP2SL

#### GC-100 Products

- GC-100-06
- GC-100-12
- GC-100-18
- GC-100-18R

#### Sending IR Signals continued ... 

In this example we will configure the iTach IP2IR TCP/IP to IR endpoint. The IP2IR can connect, monitor, and control infrared devices over a network.

After initial discovery of Global Cache devices click on the iTach IP2IR in the menu below.

#### Sending IR Signals continued ... 

The follow menus appear after the iTach device is selected. This menu is referred to as *Wizard mode*; to enter information in manually select *Normal* as the *Select Mode* option.

**3** **1** **2**

1. The *Wizard* menu provides access to configure the device to send serial strings.
2. The *Config Page* will direct you to the Global Caches internal web server; this will pop-up in another browser menu.
3. Apply an alias name and description of the device and click *Save* so the device can be accessed more quickly in the future otherwise you will need to discover the device again. These named devices will appear via drop-down above the *Device Discovery* menu.

|Arranger Digi IP 5000 User Manual Sending IR Signals continued ... The following appears after the serial command to send.|Wizard menu is selected in the previous step. Here we will configure the|
|---|---|
||1 2 3 4 5 6 7 8 9|
|1. Network / router. 2. Select I/O 54|option allows you to update the Global Caches devices network settings; by default the IP2IR is set to DHCP and falls back on APIPA 169.254.0.0/16 Network ID in absence of a DHCP server option allows you to select the IR port you wish to use.|

#### Sending IR Signals continued ... 

3. *Select Mode* drop-down menu gives you the following options: Infrared
- *The selected connection will be used as an IR output.*
Sensor

- *The selected connection will be used as a sensor input such as an occupancy sensor.*
Sensor Notify

- *The selected connection will be used as sensor input for notification purposes.*
LED Lighting

- *The selected connection will be used as output to control LED lighting.*
*4. Acquire Mode* drop-down menu gives you the following options: Manual
- *Enter IR HEX codes manually.*
Cloud Based

- *Use the Global Cache Device IR Cloud Database.* ***NOTE:** This option requires the Arranger controller to have an Internet connection.*
Learn

- *Use the Global Cache IP2IR IR leaner to learn codes from remotes*
5. Enter desired IR HEX code in this field if using the *Infrared Mode* from step 3.
6. Once all the above parameters are entered in click *Set/Stop.*
7. Select port and disconnect if required (optional).
8. Once the information above has been entered in click *Finish.*
9. Click *Send* to set or test. You can now use this generated command in a preset to be used with UI control, scheduling and automation OR send this command from a 3rd party control system to the Arranger controller to activate the current configuration. Arranger controller listens on TCP port 6980.

#### Controlling Contact Closures

The following wired Global Cache devices can be used to open/close contact closures connected to 3rd party devices from Arranger.

iTach WiFi to IR iTach Ethernet to IR iTach Ethernet to IR PN: WF2IR PN: IP2SL-P (PoE) PN: IP2SL

#### GC-100 Products

- GC-100-12
- GC-100-18
- GC-100-18R

#### Contact Closures continued ... 

In this example we will configure the iTach IP2CC TCP/IP to contact closure endpoint.

After initial discovery of Global Cache devices click on the iTach IP2CC in the menu below.

#### Contact Closures continued ... 

The following menus appear after the iTach device is selected. This menu is referred to as *Wizard mode*; to enter information in manually select *Normal* as the *Select Mode* option.

**3** **1** **2**

1. The *Wizard* menu provides access to configure the device to send serial strings.
2. The *Config Page* will direct you to the Global Caches internal web server, this will pop-up in another browser menu.
3. Apply an alias name and description of the device and click *Save* so the device can be accessed more quickly in the future, otherwise you will need to discover the device again. These named devices will appear via drop-down above the *Device Discovery* menu.

#### Contact Closures continued ... 

The following appears after the *Wizard* menu is selected in the previous step. Here we will configure which contact closure to open or close.

**1** **2**

**3** **4**

**5**

**6**

1. *Network* option allows you to update the Global Caches devices network settings; by default the IP2CC is set to DHCP and falls back on APIPA 169.254.0.0/16 Network ID in absence of a DHCP server / router.
2. *Select Relay* option allows you to select the port you wish to use.
3. *Select State* allows you to select open or closed status of selected port.

#### Contact Closures continued ... 

4. Once all the above parameters are entered in click *Set/Get* (***Set*** will configure the port as desired, ***Get*** will retrieve current status of selected port.
5. Once the information above has been entered in click *Finish.*
6. Click *Send.* You can now use this generated command in a preset to be used with UI control, scheduling and automation OR send this command from a 3rd party control system to the Arranger controller to activate the current configuration. Arranger controller listens on TCP port 6980.

#### Controlling Relays

The following wired and wireless Global Cache devices, paired with the FLC-RS adapter, can control relay outputs conntect to device from Arranger.

iTach Flex PoE iTach Flex WiFi PN: FLEXIP-IP PN: FLEXIP-IP

FLC-RS

#### Controlling Relays continued ... 

In this example we will configure the iTach Flex PoE TCP/IP endpoint coupled with the Global Cache FLC-RS cable that supports four configurable relay outputs. Relay outputs are configurable into common relay types

-Single Pole Single Throw (SPST) -Single Pole Double Throw (SPDT) -Double Pole Double Throw (DPDT)

When using the FLC-RS relay cable, be sure to set the pins on the relays for the desired configuration.

#### Wiring and jumper configuration examples...

#### Controlling Relays continued ... 

After initial discovery of Global Cache devices click on the iTach Flex PoE in the menu below.

#### Controlling Relays continued ... 

The follow menus appear after the iTach device is selected. This menu is referred to as *Wizard mode*; to enter information in manually select *Normal* as the *Select Mode* option.

**3** **1** **2**

1. The *Wizard* menu provides access to configure the device to send serial strings.
2. The *Config Page* will direct you to the Global Caches internal web server; this will pop-up in another browser menu.
3. Apply an alias name and description of the device and click *Save* so the device can be accessed more quickly in the future otherwise you will need to discover the device again. These named devices will appear via drop-down above the *Device Discovery* menu.

#### Controlling Relays continued ... 

The following appears after the *Wizard* menu is selected in the previous step. Here we will configure which relay to open or close.

**1**

**2** **3**

1. *Network* option allows you to update the Global Caches devices network settings; by default the IP2CC is set to DHCP and falls back on APIPA 169.254.0.0/16 Network ID in absence of a DHCP server / router.
2. Select the *FLC-RS relay cable* in the accessories option.
3. Click on the *Control* settings

#### Controlling Relays continued ... 

**5** **4** **6**

|4.|Select Relay that you wish to control.|
|---|---|
|5.|Select desired State.|
|6.|Once all the above parameters are entered in click Set/Get (Set will configure the port as desired, Get will retrieve current status of selected port.|
|7.|Once the information above has been entered in click Finish.|

#### Controlling Relays continued ... 

**7**

**8**

8. Click *Send.* You can now use this generated command in a preset to be used with UI control, scheduling and automation OR send this command from a 3rd party control system to the Arranger controller to activate the current configuration. Arranger controller listens on TCP port 6980.

#### Configuring Sensor and Contact Closure Triggers

The following wired and wireless Global Cache devices, paired with the FLC-RS adapter allows configuration of sensor and contact closure input triggers in Arranger

iTach Flex PoE iTach Flex WiFi PN: FLEXIP-IP PN: FLEXIP-IP

FLC-RS

The following wired Global Cache devices, paired with sensor accessories, can be used to configure sensor and contact closure input triggers.

iTach WiFi to IR iTach Ethernet to IR iTach Ethernet to IR PN: WF2IR PN: IP2SL-P (PoE) PN: IP2SL

```
IT-SP1 AC/DC Voltage Sensor IT-SC1 Contact Closure Sensor
```

#### Contact Closure and Sensor Triggers continued ... 

In this example we will configure the iTach Flex PoE TCP/IP endpoint coupled with the Global Cache FLC-RS cable to set up sensor and contact closure input triggers.

Once the wiring configuration is complete we will set up the Arranger API command [set listener} that will 'listen' for the sensor or contact closures to activate, this event can then trigger a *PRESET* in Arranger. See *Global Settings > Presets* for more information on creating Presets in Arranger.

When using the FLC-RS relay cable, be sure to set the pins on the closures are set for the desired configuration.

Wiring and jumper configuration examples for both a sensor and a contact closure ... 

Contact Closure Sensor

#### Contact Closure and Sensor Triggers continued ... 

Navigate to *Global Settings*, then click on the *Presets* sub menu

**1** **2** **3** **4**

1. Choose *New* preset.
2. Name the preset.
3. Choose the command [set listener] from the drop down list.
4. Click on *Assistant.*

#### Contact Closure and Sensor Triggers continued ... 

**6** **5**

5. Click *Device Discovery* to locate Global Cache devices on the network.
6. Click on the Flex device in the list once discovered.

#### Contact Closure and Sensor Triggers continued ... 

**14**

**7** **8**

**9**

**10** **11** **12** **13**

**15**

7. Select the input port you wish to use, in this example we chose the first input option which is set for a contact closure according to the physical pin-out configuration on the FLC-RS.
8. Configure the *Notify Port*, numbers start at 101.
9. Click *Set*.
10. Choose *ON* for the *Condition*.
11. Choose *ENABLED* for the *State*.
12. Change the *Device Port* (I/O port if you want to change the port number in the configuration)
13. Choose the appropriate *Preset Name* you want to execute when the contact closure closes.
14. Apply an alias name and description of the device and click *Save* so the device can be accessed more quickly in the future, otherwise you will need to discover the device again. These named devices will appear via drop-down above the *Device Discovery* menu.
15. Click *Finish.*

#### Contact Closure and Sensor Triggers continued ... 

**16**

**17**

16. Click *ADD* to add the generated code to the preset.
17. Click *Apply* to test, then click *Save*. The configuration for using sensors, like a PIR sensor, to execute a preset in Arranger is the SAME as above accept the input ports physical configuration will need to be set to *VOLTAGE SENSOR*. You can now schedule this preset to always be ON and listening when the Arranger controller is on or has been rebooted. See *Global Settings > Scheduler* for more information on how to use the *System Start* scheduler option.

### Global Settings

In the *Global Settings* tab you will find all the global settings of the software.

***Users*** The system can be configured for user access control. Two levels of access are available, administrator and user. An administrator will have complete access, while a user is limited to the following areas:

- Status
- Matrix
- Video Wall
The device groups for a user can also be limited so that only selected groups of encoders and decoders may be accessed.

#### Add User

Here you can add a user to the system by selecting ***Administrator*** or ***User*** access level, then enter a name and password for the new user. For user level access you can also select the accessible groups and functions.

**1** **2**

**3**

**4** **5** **6**

1. Select *Add.*
2. Select *Level.*
3. Enter in *username, password* and then *confirm password.*
4. Select *Group.*
5. Select *Function.*
6. Click *Save.*

|||Arranger Digi IP 5000 User Manual||
|---|---|---|---|
||Edit User||Here you can edit an existing user's username, password, allocated groups, and functions.|
||||1 2|
||||3|
||||4 5|
||||6|
||1.|Select|Edit.|
||2. 3.|Select Enter in|User. new password and then confirm password.|
||4.|Select|Group.|
||5.|Select|Function.|
||6.|Click|Save.|
|76||||

#### Delete User

Here you can delete an existing user from the system.

**1** **2** **3**

1. Select *Delete.*
2. Select *Username.*
3. Click *Delete.*

#### Active Users

Here you can see all the active users logged into the system and the time of their last activity.

**1**

1. Select *Active Users.*

***Groups*** System encoders and decoders can be arranged into various groups. These groups can then be individually controlled via the API or displayed in the UI. Here we manage the groups by adding, editing or deleting them. Once a group has been added to the system, the group can then be assigned to any or all encoders and decoders from the *Device Settings* tab.

***NOTE:*** The following group names cannot be used:

- ‘all’
- ‘all_rx’
- ‘all_tx’
- ‘ungrouped’
- ‘all_devices’
- Any Device name
- Any Preset name

#### Add Group

Here you can add a new group to the system to easily manage encoders and decoders. Devices can then be added to the group.

Encoders or decoders can also be assigned to groups from *Device Settings > Group.*

**1** **2**

**3**

**4**

1. Select *Add.*
2. Enter a group name.
3. Select *Devices.*
4. Click Save.

#### Edit Group

Here you can change the name of an existing group or devices associated with the group.

**1** **2** **3**

**4**

**5**

1. Select *Edit.*
2. Select *Group.*
3. Enter in new name.
4. Select *Devices.*
5. Click *Save.*

#### Delete Group

Here you can delete an existing user from the system.

**1** **2** **3**

1. Select *Delete.*
2. Select *Group.*
3. Click *Delete.*

***Multicast*** The Multicast section is used to configure the multicast range of the devices from between 224.x.x.x and

239.x.x.x with a default of 239.x.x.x. All devices must be set to the same multicast prefix.
**1** **1 2**

1. Select *Default* or enter a preferred *Multicast Prefix.*
2. Click *Save & Restart* to apply the changes.

***Permissions*** Permissions adds the ability to only allow selected encoders to be joined with selected decoders. Individual rules can be set per device or as a group as a whole. Rules are applied to the decoder.

Below, Decoder1 is only allowed to be joined with Encoder1, and Encoder2 can be joined with any other decoder except for Decoder2. Multiple conditions can be applied. Joining point-to-point the following rules will be considered before applying the join. Joining point-to-all the following rules will be applied after the join by sending a leave command to denied decoders.

**5** **4** **1 2 3**

1. Select encoder.
2. Select decoder.
3. Select Permission as either *Allow* or *Deny.*
4. Click *Save.*
5. Select the cross icons to delete.

#### Permissions continued ... 

Below, the decoders in Group1 can only be joined with the encoders in the group unless individual allow rules are also set for the decoders with other encoders outside of the group.

**2** **3** **1**

1. Select Group.
2. Click *Save.*
3. Select the cross icons to delete.

#### Security Keys

Security keys are required with all HTTP level requests and optional for TCP commands on port 6980. Only keys generated from the software can be used.

#### HTTP API Security Key

The Arranger Controller API can be accessed via HTTP GET and POST requests. To ensure security over the network a HTTP security key is required to be passed with all such requests. Here you can generate a new key or import a saved key that had been previously generated.

**1 2**

1. Select *Import Security Key* button. OR
2. Select *Generate New* button.

#### Security Keys continued ... 

#### Importing a HTTP API Security Key

**1**

1. Select *Import Security Key* button.
**2** **3**

2. Enter Security Key.
3. Click *Save.*

#### Security Keys continued ... 

#### TCP Security Key

The Arranger Controller API can be accessed via Telnet requests on TCP port 6980. To ensure security over the network a TCP security key can be passed with all such commands. Here you can generate a new key or import a saved key that had been previously generated. As the TCP security key is optional its use can be enabled or disabled from here.

**1** **2**

1. Select *Generate New* button.
2. Click *Enable.*

#### Security Keys continued ... 

#### Importing a TCP API Security Key

**1**

1. Select *Import Security Key* button.
**2** **3**

2. Enter Security Key.
3. Click *Save.*

#### Security Keys continued ... 

*Importing a TCP API Security Key Continued ... *

**4**

4. Click *Enable.*

***Analytics*** Analytical data is constantly being stored on the system. By default data will be maintained for 1 month, but this can be changed up to 12 months.

Various types of information are stored and can be exported for use in a third-party analytical application such as Microsoft’s Power Bi. Internal results for the following can be generated from the UI:

***Source Availability***

The *Source Availability* represents the percentage (%) of time an encoder has a video signal. ***Display Availability*** The *Display Availability* represents the percentage (%) of time a decoder has a monitor connected.

***Source Resolution***

The *Source Resolution* represents the combination of different resolutions used as a source.

***Source Count***

The *Source Count* represents the number of times an encoder detects a source available. ***Display Count*** The *Display Count* represents the number of times a decoder detects a display available. ***Display Source Change*** The *Display Source Change* represents the number of times a decoder has been switched to an encoder. ***Network Downtime*** The *Network Downtime* represents the time in hours a device is missing off the network. ***UI Creator*** *UI Creator* represents usage of various user interface function.

***Note:** Analytics* is a licensed required feature. If you do not have access to this option contact your Liberty

AV sales rep to upgrade.

#### Analytics continued ... 

***Source Availability***

The *Source Availability* metric represents the time in hours an encoder has video signal.

**1** **2** **3** **4** **5**

1. Select *Source Availability* from the *Select Data* drop-down.
2. Select *Group.*
3. Select *Start Date.*
4. Select *End Date.*
5. Click *Export Report.*

#### Analytics continued ... 

#### Display Availability

The *Display Availability* metric represents the time in hours a decoder has a monitor connected.

**1** **2** **3** **4** **5**

1. Select *Display Availability* from the *Select Data* drop-down.
2. Select *Group.*
3. Select *Start Date.*
4. Select *End Date.*
5. Click *Export Report.*

#### Analytics continued ... 

***Source Resolution***

The *Source Resolution* metric represents the combination of different resolutions used as a source.

**1** **2** **3** **4** **5**

1. Select *Source Resolution* from the *Select Data* drop-down.
2. Select *Group.*
3. Select *Start Date.*
4. Select *End Date.*
5. Click *Export Report.*

#### Analytics continued ... 

***Source Count***

The *Source Count* metric represents the number of times an encoder detects a source available.

**1** **2** **3** **4** **5**

1. Select *Source Count* from the *Select Data* drop-down.
2. Select *Group.*
3. Select *Start Date.*
4. Select *End Date.*
5. Click *Export Report.*

#### Analytics continued ... 

#### Display Count

The *Display Count* metric represents the number of times a decoder detects a display available.

**1** **2** **3** **4** **5**

1. Select *Display Count* from the *Select Data* drop-down.
2. Select *Group.*
3. Select *Start Date.*
4. Select *End Date.*
5. Click *Export Report.*

#### Analytics continued ... 

#### Display Source Change

The *Display Source Change* metric represents the number of times a decoder has been switched to an encoder.

**1** **2** **3** **4** **5**

1. Select *Display Source Change* from the *Select Data* drop-down.
2. Select *Group.*
3. Select *Start Date.*
4. Select *End Date.*
5. Click *Export Report.*

#### Analytics continued ... 

#### Network Downtime

The *Network Downtime* metric represents the time in hours a device is disconnected from the network.

**1** **2** **3** **4** **5**

1. Select *Network Downtime* from the *Select Data* drop-down.
2. Select *Group.*
3. Select *Start Date.*
4. Select *End Date.*
5. Click *Export Report.*

#### Analytics continued ... 

#### UI Creator

The *UI Creator* metric represents usage of various user interface functions.

**1** **2** **3** **4** **5**

1. Select *UI Creator* from the *Select Data* drop-down.
2. Select *User Interface.*
3. Select *Start Date.*
4. Select *End Date.*
5. Click *Export Report.*

***Notifications*** Notifications will send e-mail alerts whenever a selected event occurs on the system.

**1**

**2**

1. Select Event.
2. Select *Save.*

#### Email Settings

Here you configure the e-mail client to allow notification alerts to be sent from a specified e-mail account. The *Test* button sends a confirmation e-mail to confirm the settings are correct.

***Presets*** The system can store a virtually unlimited number of presets. A preset can be applied with a single ***preset load*** command. The preset can contain a virtually unlimited number of commands.

Presets can contain anything from a single command to a video wall layout.

Presets can also contain basic *if else* logic to allow you to build some “smarts” into your system. *Refer to – Preset Logic for further details.*

The following preset names cannot be used:

- ‘all’
- ‘all_rx’
- ‘all_tx’
- ‘ungrouped’
- ‘all_devices’
- Any Device name
- Any Group name

#### Make a New Preset

Here you can create a new preset to be stored on the system. Give the preset a name and then start adding control commands as required by either entering commands directly or using the *Assistant* wizard.

**1** **2** **3** **4**

**5**

**6**

1. Select *New.*
2. Enter a name for the preset.
3. Select a command from the drop-down menu.
***Note:*** Click on the *View Command Manual* link next to the ? for command definitions.

*4. Assistant* is a command wizard that will allow you to easily input the information required for the command in order to render the finished code correctly. Click on *Assistant* to build the command or enter the command in manually in the *Add* *Control Command* field.
5. Click *Add.* Notice that the command is now entered into the field labeled *Preset Commands.* If you need to enter in more commands to the preset repeat steps 3-5. Best practice! When using multiple commands in a preset, add the *preset delay* command to the preset. *Preset delay* will allow you to separate each command execution in a preset in milliseconds.
6. Click *Save* or *Apply* to test the preset.

#### Edit a Preset

Here you can edit any existing preset by adding, deleting or changing control commands as required.

**1** **2** **3** **4** **5** **6**

**7**

**8** **9**

1. Select *Edit.*
2. Select *Preset.*
3. Click *Load.* Notice that the commands in the current preset have now populated in the *Preset Commands* field which can be edited manually.
4. Change *preset name.*
5. Select a system command from the *Select Control Command* drop-down menu.
***Note:*** Click on the *View Command Manual* link next to the ? for command definitions.

*6. Assistant* is a command wizard that will allow you to easily input the information required for the command in order to render the finished code correctly. Click on *Assistant* to build the command or enter the command in manually in the *Add* *Control Command* field.
7. Click *Add.*
8. Commands can be edited manually here.
9. Click *Save* or *Apply* to test the edited preset.

#### Delete a Preset

Here you can delete any existing preset from the system.

**1** **2** **3**

1. Select *Delete.*
2. Select *Preset.*
3. Click *Delete.*

#### Apply a Preset

Here you can apply any existing preset on the system.

**1** **2** **3**

1. Select *Apply.*
2. Select *Preset.*
3. Click *Apply.*
***NOTE:*** To initiate a *Preset* using API commands use the command ***preset load [PRESET NAME].***

#### Export a Preset

Here you can export an existing preset on the system which can then be used as a backup or edited. The preset will be saved to your Downloads folder on your PC as an ini file, example; *preset1.ini.* The export preset can be edited with an application like Notepad++; right click the file and select “Open with…”

**1** **2** **3**

1. Select *Apply.*
2. Select *Preset.*
3. Click *Export.*

#### Export ALL Presets

Here you can export all existing presets on the system which can then be used as a backup or edited. The presets will be saved to your Downloads folder as an exp file:presets.exp.

**1**

1. Click *Export All.*

|Import a Preset|Arranger Digi IP 5000 User Manual Here you can import a preset into the system.|
|---|---|
||1 2 3 4|
|1. Select 2. Click 3. 4. Click|Import. Import. A pop-up window on your PC will appear; find the appropriate .ini file to import from your PC. Rename the preset if required. Save. 109|

|||Import ALL Presets|Arranger Digi IP 5000 User Manual Here you can import all presets into the system from an all preset export.|
|---|---|---|---|
||||1 2 3 4|
|110|1. 2. 3. 4.|Select Click Select Click|Import ALL. Browse. A pop-up window on your PC will appear; find the appropriate .exp file to import from your PC. Skip files or Replace Files. Import All.|

#### QR Code Preset

You can create a QR code to directly execute a preset. After the QR code has been scanned and opened in a browser the preset will be executed and the result displayed in the user's default web browser.

Here you can set how the result of a preset when scanned from a QR code will be displayed on the user's browser. This includes QR code buttons used in UI Creator.

The QR result can be *Text* for a standard API text response. Select *Static Image* to display a user uploaded image on success or failure of the preset. Or, select *User Interface* to be redirected to a *QR Results User* *Interface*. See *Global Settings > UI Creator > QR Code Result mode* for more information.

The below will provide a text response: *preset load preset1 success.*

**1** **2** **3** **4** **5** **6**

**7**

**8**

1. Select *QR Code.*
2. Select *Preset.*
3. Select *Text* from the *QR Result* drop-down menu.
*4. Click Save button.*
5. Enter *Remote URL* if QR must be accessed over the Internet.
6. Enter *QR Graphics* Size.
7. Click either *Remote or Local QR Code* button.
8. Click *Download* button.

#### QR Code Preset continued ... 

The below will provide a static image response:

**1** **2** **3** **4** **5** **6** **7** **8** **9**

**10**

1. Select *QR Code.*
2. Select *Preset.*
3. Select *Static Image* from the *QR Result* drop-down menu.
4. Select *Success Image.*
5. Select *Error Image.*
*6. Click Save button.*
7. Enter *Remote URL* if QR must be accessed over the Internet.
8. Enter *QR Graphics* Size.
9. Click either *Remote* or *Local QR Code* button.
10. Click *Download* button.

||QR Code Preset continued ... |The below will provide a QR Results user interface response:|Arranger Digi IP 5000 User Manual|
|---|---|---|---|
|||1 2 3 4 5 6 7 8|9|
|1. 2. 3. 4. 6. 7. 8. 9.|Select Select Select Select 5. Enter Enter Click either Click|QR Code. Preset. User Interface from the User Interface. Click Save button. Remote URL QR Graphics Size. Remote or Download button.|QR Result drop-down menu. if QR must be accessed over the Internet. Local QR Code button. 113|

***Scheduler*** The scheduler is used to apply presets at a particular time of a given day or on system start.

**6** **7**

#### 1 2 3 4 5

1. Enter *Event Name.*
2. Select a time.
3. Select day(s).
4. Select *Preset.*
5. Click *Save.*
6. Once saved, the pen icon is used to edit the event.
7. Click the cross icon to delete the event

***Events*** Events is a button-less control system to operate a display device such as a TV or projector automatically depending on the source status of a selected encoder. The triggered presets can contain any number of functions to select source, volume and even raise and lower projector screens.

Here you configure presets to be applied controlling a display and other devices when an encoder source becomes available or removed.

Select a *Source Connected* trigger event from an encoder then select a preset to be applied when the encoder source becomes available. You can set the *Repeat Connected Preset* option to apply this preset each time a source is applied or only if the display is off. See example below.

**6**

#### 1 2 3 4 5

1. Enter *Event Name.*
2. Select an encoder.
3. Select *Source Connected* trigger.
4. Select an 'ON' preset.
5. Click *Save.*
6. Set *Repeat Connected* Preset option

#### Events Continued ... 

Select a *Source Disconnected* trigger event from an encoder then select a preset to be applied when the encoder source becomes unavailable. The preset will only be applied after the disconnect to OFF delay duration. This event is canceled each time an encoder source becomes available.

The OFF to ON delay will prevent the source connected event for the delay duration.

**6** **1 2 3 4 5 6 7**

1. Enter *Event Name.*
2. Select an encoder.
3. Select *Source Disconnected* trigger.
4. Select an 'ON' preset.
5. Select a *Disconnect to OFF* duration.
6. Select an *OFF to ON* duration.
7. Click *Save*

#### UI Creator

*UI Creator* can be used instead of a third-party control system to fully control the functions of the system and much more. Here you can design your own user interface (UI) to recall functions that have been saved as presets.

*UI Creator* lets you create a virtually unlimited number of UI's which can be viewed on any device's supported web browser such as Google Chrome or Safari.

#### Create a New User Interface

Here you can add a new UI to the system ready to be edited as required. The UI name must be specified along with the UI resolution. A selection of standard-sized displays are available or user can enter their own size from 100x100 to 3820x2160.

**1** **2** **3** **4**

1. Select *Add.*
2. Enter UI *Name.*
3. Select UI *Size.*
4. Click *Save.* You can now *edit* this preset to build the UI.

#### Edit a User Interface

Here you can change the UI name or edit and preview an existing UI on the system. The UI service and login requirements can also be set from here.

**1** **2**

1. Select *Edit.*
2. Select UI *Name.*

#### Edit a User continued ... 

Initially only 3 pages are available, *Master, Home and Login*. The *Master* page is used for elements to be displayed on all other pages that do not have a background set. The *Home* page is the displayed page when the UI is loaded. The *Login* page is displayed when a pin code is required to access the UI. From here you can add and remove pages whenever required.

**2** **1**

1. Enter new page name
2. Click *Add*

#### UI Modes

In the highlighted section below is how you will define your UI mode.

#### There are two modes:

1) Standard -*Standard* mode provides the default pages *Master Page, Home Page and Login Page*. The *Master Page* is used to display the elements on all other pages without a background applied. The *Home* *Page* is the initial page to be displayed. The *Login page* is shown when a login code is required. *Standard* *mode* provides options for limiting the maximum allowed clients and login with fixed or random number with a session timeout.
2) QR Code Result -*QR Code Result* mode provides the default pages *Master, Success and Error*. The Master page is used to display the elements on all other pages without a background applied. The *Success page* is shown after a scanned QR code preset is executed successfully. The *Error page* is shown after a scanned QR Code preset is executed with an error. The resulting user interface can be used to display a single page message or a multipage user interface with the same abilities as standard mode. See *Global Settings > Presets > QR Code Preset* or more details.

#### Standard Mode

In the section below a standard configuration has been made.

**1** **2** **3** **4** **5** **6** **7** **8**

1. Select *Standard* mode.
2. Select a *Preset* from the Initial Preset drop-down. The *Initial Preset* is used to select a preset to be executed when the UI service is enabled. This preset can be used to set a default configuration to match the user interface initial button states. The control command ***set ui*** can be used to toggle the service state.
3. Select *Enable* from *Service* drop-down. When *Service* is *disabled* the UI will not be able to be accessed by a client.
4. Select a maximum number of control clients that can access the UI simultaneously.
5. Select *Login* option; *NONE, Random, User defined Login.* If a pin code to access the user interface is not required then leave the login as *NONE*. The login page will not be used or shown in the case.
6. If the *Random* login code option is selected in Step 5, a random number will be displayed here, this is the login code. If *User Defined option* was selected in Step 5 then you will be able to define the code in this field.
7. A *timeout* can also be applied here when using a login pin code that will prevent the client access after the selected time has elapsed.
8. Click *Save* to save UI or *Preview* to preview your UI in a web browser.

#### QR Code Result Mode

In the section below a *QR Code Result* configuration has been made.

See *Global Settings > Presets > QR Code Preset* for more information on linking QR Code presets to a QR Code Result UI.

**1** **2**

1. Select *QR Code Result* mode.
2. Select *Enable* from *Service* drop-down. When *Service* is *disabled* the UI will not be able to be accessed by a client.

#### Adding Labels

A *label* can be dragged to any location and used as a heading, label or wherever text is required on the UI. The label must be given a name to change the color, text and visibility via the control command ***set ui_label.***

Here we are adding a title for the UI on the *master page* by dragging and dropping the label icon into the UI layout.

#### Adding Labels continued ... 

Once a label has been added the *Label Settings* will load to the right of the screen, see highlighted section below.

From here you can edit the text font, size, style, alignment and position, given the label a name or remove it from the UI.

***Note:*** You can always populate the *Label Settings* by clicking on any label in the UI.

#### Adding Buttons

A *button* can be dragged to any location and used as a press button, QR Code or an indicator.

#### Adding buttons continued ... 

Once a button has been placed in the UI the *Button Settings* will populate to right of the UI Creator. See highlighted section below.

***Note:*** You can always populate the *Button Settings* by clicking on any button in the UI.

***Note:*** There are two selectable menus in *Button Settings.*

1. Graphical-Will allow you to edit the button size, position, text font, size, style and alignment, or remove the button from the UI altogether.
2. Functional-Allows you to configure the *Preset* triggers once a button has been pressed.

#### Adding buttons continued ... 

There are three choices for a button image:

1) Use an external pre made button image (External File)
2) Use internal Arranger button image (Library)
3) Use a static or streamed preview image from the specified endpoint (Preview)
Select an image for the button by selecting either *External File* and browsing your own images or selecting *Library* to choose one from the button library. When selecting an image from the button library, both state 1 and state 2 images will be assigned when required. When using external file, an image must be assigned for each button state.

**1** **2**

1. Select *Library, External File or Preview* from image drop-down.
2. If you select *Library* from Step 1, click *Library* to access the internal library of button graphics. If you select *External File* from Step 1, click *Browse* to access your files on your PC to use as the button graphic. If you choose *Preview* then you will need to select the *Device* and *Function* associated with the preview in the *Graphical* and *Functional Properties*.

#### Adding buttons continued ... 

In the examples below, common buttons from the internal graphical library have been used.

#### Adding buttons continued ... 

***Note:*** To help align buttons on the UI layout, click on any open and unused space in the UI and select

*Grid* type near the top right of UI Creator. The buttons will align with the grid selections you have made. In the example to the right, small grid size has been used.

Multiple elements can be aligned with respect to the first selected element.

Click on the first referenced element to select it, then hold Ctrl while selecting further elements to be aligned. An *Element Alignment & Distribution* panel will then be shown to Align Vertically, Align Horizontally, Distribute Horizontally or Distribute Vertically.

Clicking in white space will deselect selected elements.

#### Button Logic

A *button* can be configured to operate with 6 different functions as explained here:

1. Momentary button-A *Momentary* button will operate in a push-button single-state fashion where a preset is executed once for every press.
2. Repeat button-A *Repeat* button will operate in a momentary fashion where only a preset is assigned to state 1 but the preset will be repeated while the button is held down. The preset will be executed as soon as the button is pressed, then there is a configurable repeat delay before repeating begins and a configurable repeating interval which sets the delay time between preset execution.
3. Toggle button-A *Toggle* button will operate in a *push on, push off* fashion so a preset can be assigned to both state 1 and state 2. First press of the button executes state 1 preset and puts the button into state 2 showing a state 2 button image. Second press of the button then executes state 2 preset and returns the button back to state 1.
4. Radio Toggle button (Exclusive Toggle button) - A *Radio Toggle* group of buttons will operate in an exclusive toggle fashion and must be assigned to a *Button Group*. When you want a group of buttons to work together as radio toggle buttons where only one button of the group can be in state 2 (down), such as a radio station selector or source selection, then define the same button group name for each of those buttons.
5. Split button-A *Split* group of buttons will work in a matrix type way whereby buttons are configured as either an encoder button or decoder Button. Encoder buttons will operate as radio (exclusive) toggle buttons so only one can be selected, while the decoder buttons will operate as a toggle button so multiple can be selected.
6. QR Code Button-Adds touchless functionality to a touchscreen control panel. A QR code button will operate in a momentarily fashion where only a preset is assigned to state 1 and a QR code replaces the button image. When the QR code is scanned a virtual press of the button is performed. Button logic options can be accessed and set in the *Functional* menu of *Button Settings* under *Button Type* for the selected button in the UI layout.

#### Button Logic-Momentary

A *Momentary* button will operate in a push-button single-state fashion where a preset is executed once for every press.

Select a button in the UI layout to populate the *Button Settings*, then navigate to the *Functional* menu.

**1** **2** **3**

**4**

**5**

**6** **7** **8**

1. Enter a *Name* for the button. A button name is required as a reference for *Analytics* or when manipulating the button from another buttons functionality or via the API. See *Global* *Settings > Analytics > UI Creator* for reference.
2. Select *Momentary.*
3. Select a button function from the *Analytics* list that best matches the operation of the button.
4. Select *Initial Button State:* This is the initial state of the button when the UI is loaded.
5. Select the *Preset* to be executed on button press.
6. Change Page: This allows you to change to another page.
7. Change Button State: This allows you to change the state of a button.
8. Change Button Image: This allows you to change the image of a button.

#### Button Logic-Toggle

A *Toggle* button will operate in a push on, push off fashion so a preset can be assigned to both state 1 and state 2. First press of the button executes state 1 preset and puts the button into state 2 showing a state 2 button image. Second press of the button then executes state 2 preset and returns the button back to state 1.

**1** **2** **3**

**4**

**5**

**6** **7** **8**

1. Enter a *Name* for the button. A button name is required as a reference for analytics or when manipulating the button from another buttons functionality or via the API. *See Global* *Settings > Analytics > UI Creator for reference.*
2. Select *Toggle.*
3. Select a button function from the *Analytics* list that best matches the operation of the button.
4. Select *Initial Button State:* This is the initial state of the button when the UI is loaded.
5. State 1 / State 2: These buttons allow you to select the following for each button state: *Preset:* Select the preset to be executed on button press. *Change Page:* This allows you to change to another page. *Change Button State:* This allows you to change the state of a button. *Change Button Image:* This allows you to change the image of a button.

#### Button Logic-Radio Toggle

A *Radio Toggle* group of buttons will operate in an exclusive toggle fashion and must be assigned to a *Button* *Group*. When you want a group of buttons to work together as radio toggle buttons where only one button of the group can be in state 2 (down), such as a radio station selector or source selection, then define the same button group name for each of those buttons.

**1** **2** **3** **4**

**5**

**6**

**7** **8** **9**

1. Enter a *Name* for the button. A button name is required as a reference for analytics or when manipulating the button from another buttons functionality or via the API. *See Global* *Settings > Analytics > UI Creator for reference.*
2. Select *Radio Toggle.*
3. Select a button function from the *Analytics* list that best matches the operation of the button.
*4. Button Group:* A group name must be provided to combine individual buttons to function together.
5. Select *Initial Button State:* This is the initial state of the button when the UI is loaded.
6. Select the *Preset* to be executed on button press.
7. Change Page: This allows you to change to another page.
8. Change Button State: This allows you to change the state of a button.
9. Change Button Image: This allows you to change the image of a button.

#### Button Logic-Split

A *Split* group of buttons will work in a matrix type way whereby buttons are configured as either an *Encoder* button or *Decoder* button. *Encoder* buttons will operate as *Radio* (Exclusive) toggle buttons so only one can be selected, while the *Decoder* buttons will operate as a *Toggle* button so multiple can be selected.

Once a button is configured as an encoder button next the actual encoder to be used is selected. Buttons configured as a decoder button will also have the required decoder selected along with a preset that is executed when the decoder button is pressed.

Special presets have to be created for this decoder button. In the *Preset* assistant you will notice in the device lists “<<Encoder>>” and “<<Decoder>>”. These are the device selections required to create presets for split button functionality. “<<Encoder>>” will be replaced by the selected encoder button and “<<Decoder>>” will be replaced by the selected decoder button.

Preset example: join av <<Encoder>> <<Decoder>> set volume <<Decoder>> 0

If you need to interact with buttons then a unique name for the button must be specified. The state of the button can then be changed with the functionality settings or via the control command ***set ui_button***. The ***set ui_button*** command can also be used to change the buttons toggle state, enabled state, text or be virtually pressed.

Here you can see the functionality of an encoder split button.

**1** **2** **3** **4**

**5**

**6**

**7**

**8**

**9** **10**

1. Enter a *Name* for the button. A button name is required as a reference for analytics or when manipulating the button from another button's functionality or via the API. *See Global* *Settings > Analytics > UI Creator for reference.*
2. Select *Split.*
3. Select a button function from the *Analytics* list that best matches the operation of the button.
4. Enter *Button Group* name: A group name must be provided to combine individual buttons to function together.
5. Select *Initial Button State:* This is the initial state of the button when the UI is loaded.
6. Function: Select the button to operate the encoder.
7. Group: Allows you to filter the encoders by group.
8. Select Device: Select the required encoder.
9. Change Page: This allows you to change to another page.
10. Change Button State: This allows you to change the state of a button.

#### Button Logic-Split continued ... 

Here you can see the functionality of a decoder split button.

**1** **2** **3** **4**

**5**

**6**

**7**

**8**

**9** **10**

1. Enter a *Name* for the button. A button name is required as a reference for analytics or when manipulating the button from another button's functionality or via the API. *See Global* *Settings > Analytics > UI Creator for reference.*
2. Select *Split.*
3. Select a button function from the analytics list that best matches the operation of the button.
4. Enter *Button Group* name: A group name must be provided to combine individual buttons to function together.
5. Select *Initial Button State:* This is the initial state of the button when the UI is loaded.
6. Function: Select the button to operate the decoder.
7. Group: Allows you to filter the decoders by group.
8. Select Device: Select the required decoder.
9. State 1 / State 2: These buttons allow you to select the following for each button state: *Preset*: Select the preset to be executed on button press. *Change Button State:* This allows you to change the state of a button. *Change Button Image:* This allows you to change the image of a button.

#### Button Logic-Repeat

A *Repeat* button will operate in a momentary fashion where only a preset is assigned to state 1 but the preset will be repeated while the button is held down. The preset will be executed as soon as the button is pressed, then there is a configurable repeat delay before repeating begins and a configurable repeating interval which sets the delay time between preset execution.

**1** **2** **3** **4** **5**

**6**

**7**

**8** **9** **10** **11**

1. Enter a *Name* for the button. A button name is required as a reference for analytics or when manipulating the button from another button's functionality or via the API. *See Global* *Settings > Analytics > UI Creator for reference.*
2. Select *Repeat.*
3. Select a button function from the *Analytics* list that best matches the operation of the button.
4. Select *Initial Button State:* This is the initial state of the button when the UI is loaded.
5. Continue On Error: This is an option to continue executing the preset if it returns failed.
6. Repeating Interval: This is the time delay in milliseconds the button preset repeats while being held down.
7. Repeat Delay: This is the time in milliseconds the button must remain held down before the preset starts repeating.
8. Preset: Select the preset to be executed on button press.
9. Change Page: This allows you to change to another page.
10. Change Button State: This allows you to change the state of a button.
11. Change Button Image: This allows you to change the image of a button.

#### Button Logic-QR Code

Adds touchless functionality to a touchscreen control panel. A *QR Code* button will operate in a momentary fashion where only a preset is assigned to state 1 and a QR code replaces the button image. When the QR code is scanned a virtual press of the button is performed.

**1** **2** **3**

**4**

**5**

**6**

**7** **7** **8**

1. Enter a *Name* for the button. A button name is required as a reference for analytics or when manipulating the button from another button's functionality or via the API. *See Global* *Settings > Analytics > UI Creator for reference.*
2. Select *Repeat.*
3. Select a button function from the *Analytics* list that best matches the operation of the button.
4. External URL: Enter the controller's external URL if working outside of the local network.
5. Preset: Select the preset to be executed on button press.
6. Change Page: This allows you to change to another page.
7. Change Button State: This allows you to change the state of a button.
8. Change Button Image: This allows you to change the image of a button.

#### Adding an Image

An *Image* can be dragged to any location then resized by dragging the image placeholder or changing the image settings directly. The selected image will be resized to fit the size of the image placeholder. It is recommended to use only the same sized images as the size being displayed.

The image must be given a name to change the visibility via the control command ***set ui_image.***

#### Adding an Image continued ... 

Once an image has been placed in the UI the *Image Settings* will populate to right of the UI Creator. Image settings gives you the ability to size and name the image as required. See highlighted section below.

***Note:*** You can always populate the *Image Settings* by clicking on any image in the UI.

To select an image from your PC, select the *Image > Browse* button to browse local folders on your PC.

#### Adding an Image continued ... 

Here a logo image has now been assigned.

#### Copying and Pasting Elements

Any button label or image can be copied and pasted onto the UI. You copy the style, size or the element exactly.

**1** **2**

1. Click on any button, label or image element in the UI.
2. Click *Copy Element*, then choose what copy type and click *Copy.*

#### Copying and Pasting continued ... 

Once an element has been copied, you will now see in the upper right-hand corner of the UI Creator an icon that says *Paste Element*. Click this icon to paste the copy type selection into the UI.

#### Adding a Background

Either an image or solid color can be selected for the page background. Applying a background on the *Master* *Page* will be seen on all other pages without a background. Applying a background to any other page than the *Master Page* will hide the *Master Page* altogether.

Click the *Background Image* icon to the right of UI creator to browse your local folders on your PC for a background image to use as a background.

If a solid color for the background is required then select the *Background Color* icon and select a color from the pop-up color picker.

#### Adding a Background continued ... 

Here a background image has been applied to the *Master Page.*

Here a background color has been applied to the *Master Page.*

#### Duplicate a User Interface

Here you can duplicate an existing user interface to be used as a backup or duplicated from a template file that can then be edited.

**1** **2** **3** **4**

1. Select *Duplicate.*
2. Select *UI.*
3. Enter name of duplicate UI.
4. Click *Save.*

#### Delete a User Interface

To delete an existing UI select option *Delete*, select the user interface and then click the delete button.

**1** **2** **3**

1. Select *Delete.*
2. Select *UI.*
3. Click *Save.*

#### Generating a Local UI QR Code and URL

QR codes and URL links can be generated and downloaded to easily create the URL required to browse to the *User Interface* webpage. The size of the QR code can be set between 100 – 2000px.

**1** **2**

**3**

**4** **5**

1. Select *Generate QR Code.*
2. Select *UI.*
3. Enter QR code *Size.*
4. Click *Local QR Code.*
**5. Click** *Download.* The URL for the UI is displayed under the QR code.

#### Generating a Remote UI QR Code and URL

To browse to the UI via an external URL enter the details in the external URL box and select remote QR code. The size of the QR code image can be changed then downloaded to be used in manuals or printed as required.

**1** **2** **3** **4** **5** **6**

1. Select *Generate QR Code.*
2. Select *UI.*
3. Enter *Remote URL.*
4. Enter QR code *Size.*
5. Click *Remote QR Code.*
**6. Click** *Download.* The URL for the UI is displayed under the QR code.

#### Exporting / Importing User Interface

To keep a backup of your UI work select *Export / Import* then click the *Export* button.

A *.exp file will be saved to your downloads folder.

**1** **2** **3**

1. Select *Export / Import.*
2. Select *UI.*
3. Click *Export* to export .exp file to your Downloads folder. OR Click *Import* to import an .exp file from your local PC.

### System / Controller Settings

All the controller's system level settings can be accessed by admin level users via drop-down menu by clicking the gear icon on the top right of the Arranger software banner.

#### Network Settings

*Single Network Mode* **NOTE:** By default the Arranger controller operates in *Single Network Mode.* Connect the RJ45 connection of the Arranger controller directly to the AV LAN for this operation. See next page for *Dual Network Mode.*

Here you can change the network configuration of the Arranger controller. This address must be set in the same range as the encoders and decoders. By default the Arranger controller will be found at 169.254.1.1. To locate the IP address of the Arranger controller at any time, connect the HDMI output of the controller into any display; the IP address will show on the on-screen display upper left-hand corner.

**1** **2 5**

**3**

**4**

1. Select *Network Settings.*
2. DHCP-check this box if you want the IP address for the controller to be set automatically by a third-party router or DHCP server.
3. If using a static IP address simply enter the static address, subnet, gateway and name of hostname if required.
4. Click *Save and Restart*.
5. Click *Load Default* to reset device to the factory default IP address of 169.254.1.1.

#### Network Settings continued ... 

*Dual Network Mode* When using *Dual Network Mode* you can use the Arranger controller to bridge a Client or primary LAN to access or control the AV LAN without converging the two networks. This allows for a physical dedicated network for the AV components so multicast doesn't have to be managed on the Client or primary LAN.

A USB to Gigabit Ethernet NIC Network Adapter can be attached to the controller providing a second dedicated AV Endpoint network. Approved adapters include Insignia NS-PU98505, Tripp-Lite U236-000-GBW and Cable Matters 202013.

The controllers NIC (RJ45) can be dedicated to Client LAN Communication while the secondary NIC (USB) is dedicated to Digi IP endpoint communication / subnet. Peripheral TCP devices can be controlled from either.

By default the Arranger Controller will be found on the primary NIC (RJ45) at 192.168.1.1 while maintaining

169.254.1.1 IP for the Digi IP LAN via USB / Ethernet adapter. NOTE: Only a static IP address can be applied to the secondary NIC, the primary NIC also supports DHCP. All Digi IP Endpoints must be connected to secondary NIC and set in the same IP range.
1. Power on the Arranger Controller and wait for at least 1 minute before continuing.
2. Plug the USB to Gigabit Ethernet NIC Network Adapter into a USB port of the controller.
3. Perform a Factory Reset: Insert a USB key into the Arranger controller with ONLY a text file titled *factoryreset.txt* for 10 seconds, then remove the USB key.
4. Browse to the controllers default IP address at 192.168.1.1 and configure the controllers network by navigating to *1)* the settings icon on Arranger *2)* choose Network Settings from drop down menu
**1** **2**

#### Advanced Settings

The *Advanced Settings* section contains the timing, leave subscriptions and Telnet port restriction settings of the controller.

**1**

**2** **3** **4** **5** **6** **7** **8** **9** **10**

#### Advanced Settings continued ... 

1. Select *Advanced Settings*
**2. Device Data Refresh** -*Device Data Refresh* is the time in milliseconds the Arranger Controller requests information about the encoders and decoders. This keeps the UI up-to-date with any changes that have occurred that do not cause an event which would automatically update data. The default is 60000 = 60 seconds with a range of 10000 – 120000.
**3. Leave Subscriptions on System Start** -*Leave Subscriptions* on system start is an optional condition of the system whereby all decoders will leave their assigned encoder subscription when the system starts. The default is disabled.
**4. Telnet Port 6980 Connection limitation** - Here you can set the number of simultaneous connections to the Telnet TCP control port 6980 to unlimited or from 1 to 10 connections.
**5. Serial Timeout**-*Serial Timeout* is the maximum time in milliseconds the Arranger Controller will wait for a response from a RS232 serial controlled device. The default is 3000 = 3 seconds with a range of 1000 – 30000.
**6. TCP Timeout** -*TCP Timeout* is the maximum time in milliseconds the Arranger controller will wait for a response from a TCP-controlled device. The default is 3000 = 3 seconds with a range of 1000 – 30000.
**7. Global Cache Timeout** -*Global Cache Timeout* is the maximum time in milliseconds the Arranger controller will wait for a response from a Global Cache device. The default is 5000 = 5 seconds with a range of 1000 – 30000.
**8. Static Preview Image Override** -*Static Preview Image Override* enables the use of static JPG preview images rather than a MJPEG stream provided by the endpoints. A stream requires a direct connection to the endpoint which is not always possible when the client side is working over a remote URL or different subnet. Using static images instead overcomes this issue by caching the images on the server and pushing them out to clients.
**9. Static Preview Image Interval -** *Static Preview Image Interval* used with *Static Preview Image* *Override* is the interval in seconds the preview images are updated client side. The default is 10, with selectable 5, 10, 20, 30, 60 second intervals.
10. Click ***Save**.*

#### Export Settings

Export Settings will save a file named UIsettings.exp to your downloads folder. This file contains all the settings of the Arranger controller. Use this exported file as a configuration backup that can be imported back into the system to restore the current configuration.

**1** **2**

1. Select *Export Settings.*
2. Click *Export Settings.*

#### Import Settings

Use Import Settings to load an exported UIsettings.exp file which will restore the Arranger controller's settings.

**1** **2**

1. Select *Import Settings.*
2. Click *Import Settings.*

#### System Clock

The Arranger controller contains a RTC (Real Time Clock) to maintain the correct time and date. Set your local time and date here and click the Save button to apply the changes. The system clock is used for the scheduler and also time stamping the log entries.

#### System Reboot

Here you can reboot the Arranger controller. It takes 90 seconds for the controller to reboot.

#### System Logs

The system keeps a log of all system activities. The level of logged information can be set from the Log Level selection. Click the *Export* button to export the log. A file named softwareLog.exp will be saved to your downloads folder. This file has zip compression.

***License*** The Arranger controller will not operate without a valid license. When the Arranger controller is used for the first time you will be prompted to enter a license key. If a license key has already been issued it can be entered into the system from here. Contact your Liberty AV sales rep or distributor for all licensing requirements.

#### Software Version

Here you can find the current software version.

#### Check for Updates

*Check for Updates* will contact an ftp server over the Internet to obtain the latest releases.

#### Import Updates

When no Internet access is available or a specific update is required, the files will be provided to manually update the system.

Select the type of update being performed by either selecting Software, Encoder or Decoder. Then click the browse button to select the required file from the file dialog pop-up.

### Security Features

The Arranger software has many security features built in which will be described in detail below. Some of these features are optional and can be enabled or disabled depending on your system security requirements.

#### 1. Required security key with all HTTP requests

The API of the system is accessible via HTTP PUT & GET requests which are protected with the addition of a security key that must be passed with each request. The security key is accessible from the Global Settings – Security Keys tab.

#### 2. Optional security key with all TCP commands

The API of the system is accessible via TCP port 6980 which can be optionally protected with a security key that must be passed with each command. The security key is accessible from the Global Settings – Security Keys tab.

#### 3. Leave Subscriptions on new Decoder detection

Without this feature there is a possibility that connecting a decoder to the network could receive video and audio if already subscribed (joined) to a used encoder’s multicast address. To eliminate this possibility any newly discovered decoder will be issued a leave-all command which will cause the decoder to leave all video and audio subscriptions (remove joins). This feature is active only after system start and connected encoders and decoders are detected.

#### 4. Leave Subscriptions on System Start

This is an optional feature which can be enabled or disabled from the Settings – Advanced Settings tab. Without this feature all decoders will still be subscribed (joined) to the same encoders as before the system was powered off. Some systems will be required to power on in the same state with the same joins as when powered off, while other situations this could be a security risk. To eliminate this possibility when the feature is enabled a leave-all command will be sent to all decoders automatically on system start.

#### 5. Permissions

Permissions has the ability to only allow certain encoders to be joined with certain decoders. Example: Encoder1 is only allowed to be joined with Decoder1, and Encoder2 can be joined with any decoder except for Decoder2. Multiple conditions can be applied.

#### 6. User Login Failure

This is an optional feature that is part of the system *Notifications* functions available from the Global Settings – *Notifications* tab. An email can be sent after three (3) failed login attempts to the system.

#### 7. Limiting simultaneous TCP connections to control port 6980

By default there is no limitation to the number of simultaneous TCP connections to control port 6980. The number of simultaneous TCP connections can be limited between 1 and 10 from the UI Settings *Advanced* tab Connections Limit.

### How to HTTP Request

- GET = http://<controllerURL>/api/command/<ARRANGER_API_COMMAND>/<KEY>
- POST = http://<controllerURL>/api/command/{'cmd': '<ARRANGER_API_COMMAND>', 'key': '<KEY>'}
#### Example 1 - POST-ajax

```
<script language='JavaScript' type='text/javascript'>
var controllerIP = '169.254.1.1'; *change this to the same IP address as the
controller var BaseURL = 'http://' + controllerIP + '/api/command/';
var MAXIMUM_WAITING_TIME = 5000; *timeout in milliseconds
var CheckStatusTimer; var key = '123xyz'; *replace this with the generated
security key var command = '123xyz'; *replace with any Arranger API command
$.ajax({
type: 'POST',
crossDomain: true,
contentType: 'application/json; charset=utf-8',
dataType: 'text',
url: BaseURL, data: “{'cmd':' + command + ','key':' + key + '}”,
timeout: MAXIMUM_WAITING_TIME,
success: function(data, textStatus, XMLHttpRequest){
console.log(data);
},
error: function (XMLHttpRequest, textStatus, errorThrown) {
console.log('ERROR = ' + errorThrown;
}
});
</script>
```

#### Example 2 - POST-xhr

```
<script language='JavaScript' type='text/javascript'>
var controllerIP = '169.254.1.1'; *change this to the same IP address as the
controller
var BaseURL = 'http:// ' + controllerIP + '/api/command/';
var key = '123xyz'; *replace this with the generated security key
var command = '123xyz'; *replace with any Arranger API command
var xmlRequest = new XMLHttpRequest(; xmlRequest.open('POST', BaseURL,
true);
var params = “{'cmd':' +command+ ', 'key':' + key + '}”;
var MAXIMUM_WAITING_TIME = 5000;
xmlRequest.onreadystatechange = function () {
if (this.readyState == 4) {
clearTimeout(xmlTimer);
if(this.status == 200){
console.log(this.responseText);
}else{
console.log('ERROR = ' + this.status + ' ' + this.statusText);
}
}else{
if(this.status != 200){
console.log('ERROR = ' + this.status + ' ' + this.statusText);
}
};
xmlRequest.send(params);
var xmlTimer = setTimeout(function() {
xmlRequest.abort();
console.log('ERROR = timeout');
}, MAXIMUM_WAITING_TIME);
</script>
```
