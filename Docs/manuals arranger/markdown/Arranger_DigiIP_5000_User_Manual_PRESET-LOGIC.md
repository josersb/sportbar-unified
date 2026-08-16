Arranger Digi IP 5000 User Manual

# Preset Logic

Basic ***if else*** logic can be applied within a preset to allow you to build some smarts into your system. All get commands can be used as an expression.

## The following syntax applies:

```
if (something) {
do_something
…
} else {
do_this_instead
…
}
```
The following get commands will return a string value that can be used with:

- *== (equal to)*
- *!= (not equal to)* *o get audio_source* *o get devices* *o get edid* *o get scaler <encoder_device_name> all* *o get status* *o get var* *o get ver* *o get video <encoder_device_name> all* *o get encoder*
```
Example 1:
if (get encoder Decoder1 == Encoder1) {
join all Encoder2 Decoder1
} else {
join all Encoder1 Decoder2
}
Example 2:
if (get audio_source Decoder1 != hdmi) {
set audio_source Decoder1 hdmi
}
```

The following ***get*** commands will return an integer value that can be used with:

- *== (equal to)*
- *!= (not equal to)*
- *< (less than)*
- *> (greater than)* *o get frame_converter* *o get preferred* *o get rotation* *o get scaler <encoder_device_name> width* *o get scaler <encoder_device_name> height* *o get scaler <encoder_device_name> fps* *o get video <encoder_device_name> width* *o get video <encoder_device_name> height* *o get video <encoder_device_name> fps* *o get video <encoder_device_name> sm* *o get video quality* *o get volume*
```
Example:
if (get rotation Encoder1 != 0) {
set rotation Encoder1 0
} else {
join all Encoder1 Decoder1
}
```
The following ***get*** commands will return a boolean value that can be used with:

- *! (not)* *o get display_status* *o get var* *o get video_mute* *o get video_status* *o get ui_button*
```
Example 1:
if (get video_status Encoder1) {
join all Encoder1 Decoder1
} else {
if (get video_status Encoder2) {
join all Encoder2 Decoder1
}
}
Example 2:
if !(get video_status Encoder1) {
join all Encoder2 Decoder1
}
```

# Using Google Assistant

The Arranger controller can be controlled with voice commands via Google Assistant. In this example we will run through the requirements to do so. An IFTTT account will also be required. Visit www.ifttt.com for more information.

To find out how to link your Google account with IFTTT visit this Google help page.

ttps://support.google.com/googlenest/answer/7194656 h

First step is to set up the Arranger controller so it is accessible from the Internet. Port 80 of the Arranger controller will need to be port-forwarded to an external IP port. For this example we are going to use an external IP address of 123.456.789.100 and a controller IP address of 169.254.1.1. From your router, port forward from internal 169.254.1.1 port 80 to external, say port 9999 (you can use any unused port number here). Every router is configured differently, so consult your router's owner's manual if required.

Now externally you should be able to access the Arranger controller's webpage by entering ‘123.456.789.100:9999’ into a browser.

Now we can set up IFTTT to activate any command on the Arranger controller but we strongly advise that Arranger *Presets* only are specified for this activity.

Open your IFTTT account and *Create* a new applet Click *if This Add*

## Using Google Assistant continued ... 

|Search and select Google|You will be prompted for|
|---|---|
|Assistant when asked to|your Google account login,|
|choose a service in the|click Connect to proceed|

## IFTTT applet wizard

|Choose the Say a Simple|Choose what you will say,|
|---|---|
|Phrase when asked for a|the Google response and|
|trigger|click Create Trigger|

## Using Google Assistant continued ... 

Search and choose *Webhooks* when asked for Click *Then That Add* a service

You will be prompted to connect to *Webhooks* click *Connect* to proceed Click *Make a web request*

## Using Google Assistant continued ... 

- Now enter the URL which is the external IP address and port established in the router. In our previous example; ‘123.456.789.100:9999’
- Select Method: ‘POST’
- Select Content Type: ‘application/json’
- Enter Body with desired command (see below)
- Click ‘Create action’ {"cmd":"<command>","key":"<security_key>"} = {"cmd":"preset load <preset>","key:"<security_key>"} *where:* *<preset> = Name given to the preset to be applied ^<security_key> = HTTP Security key Example: {"cmd":"preset load MyPreset","key":"ts2Xe1sn1Nk1rm1>l1$p1Tk18q14e"}
*For more information on building and using Presets, see *Global Settings > Presets*

^For more information on generating and using HTTP Security keys, see *Global Settings > Security Keys > HTTP Security Key*

# Using Command Assistant

When dealing with direct API control commands or creating presets, the *Command Assistant* wizard is available for all commands to help make the construction of command strings as simple as possible.

Most commands have a *Normal* and *Wizard* mode of creation. In *Normal* mode most parameters are set by entering the details into the various text boxes manually, while in *Wizard* mode parameters are mostly set with drop-down selections to ensure the syntax of the command is correct.

Below are explanations for all commands using *Normal* and *Wizard* mode.

## Command: join all-Normal Mode

*1. Enter optional Security Key*
*2. Enter Encoder Device Name*
*3. Enter Decoder or Group name*
*4. Select Exclusive (optional)***1**
*5. Select Video Mode (optional)*
**2**

*6. Click Finish button*
**3** **4** **5** **6**

## Command: join all-Wizard Mode

*1. Select Encoder Device Name*
*2.a Select Device(s)*
*2.b Select Decoder or Group name*
*3. Select Exclusive (optional)*
*4. Select Video Mode (optional)***1**
*5. Click Finish button*
**2a**

**2b** **3** **4** **5**

## Command: join av-Normal Mode

*1. Enter optional Security Key*
*2. Enter Encoder Device Name*
*3. Enter Decoder or Group name*
*4. Select Exclusive (optional)***1**
*5. Select Video Mode (optional)*
**2**

*6. Click Finish button*
**3** **4** **5** **6**

## Command: join av-Wizard Mode

*1. Select Encoder Device Name*
*2.a Select Device(s)*
*2.b Select Decoder or Group name*
*3. Select Exclusive (optional)*
*4. Select Video Mode (optional)* **1**
*5. Click Finish button*
**2a**

**2b** **3** **4** **5**

## Command: join video - Normal Mode

*2. Enter Encoder Device Name*
*3. Enter Decoder or Group name*
**1**

*4. Select Exclusive (optional)*
*5. Select Video Mode (optional)***2**
*6. Click Finish button*
**3** **4** **5** **6**

## Command: join video - Wizard Mode

*1. Select Encoder Device Name*
*2.a Select Device(s)*
*2.b Select Decoder or Group name*
*3. Select Exclusive (optional)*
*4. Select Video Mode (optional)* **1**
*5. Click Finish button*
**2a**

**2b** **3** **4** **5**

## Command: join audio-Normal Mode

*2. Enter Encoder Device Name*
*3. Enter Decoder or Group name*
*4. Select Exclusive (optional)* **1**
*5. Click Finish button*
**2** **3** **4** **5**

## Command: join audio-Wizard Mode

*1. Select Encoder Device Name*
*2.a Select Device(s)*
*2.b Select Decoder or Group name*
*3. Select Exclusive (optional)*
*4. Click Finish button***1**
**2a**

**2b** **3** **4**

## Command: join serial-Normal Mode

*2. Enter Encoder Device Name*
*3. Enter Decoder or Group name*
*4. Select Exclusive (optional)*
**1**

*5. Click Finish button*
**2** **3** **4** **5**

## Command: join serial-Wizard Mode

*1. Select Encoder Device Name*
*2.a Select Device(s)*
*2.a Select Decoder or Group name*
*3. Select Exclusive (optional)***1**
*4. Click Finish button*
**2a**

**2b** **3** **4**

***Note:*** Only devices in serial *Matrix* mode will be seen in the device lists. To change serial modes see

*Devices Settings > RS232 Serial*.

## Command: join ir-Normal Mode

*2. Enter Encoder Device Name*
*3. Enter Decoder or Group name*
*4. Select Exclusive (optional)***1**
*5. Click Finish button*
**2** **3** **4** **5**

## Command: join ir-Wizard Mode

*1. Select Encoder Device Name*
*2.a Select Device(s)*
*2.b Select Decoder or Group name*
*3. Select Exclusive (optional)***1**
*4. Click Finish button*
**2a**

**2b** **3** **4**

## Command: join usb-Normal Mode

*2. Enter Encoder Device Name*
*3. Enter Decoder or Group name*
*4. Select Exclusive (optional)*
**1**

*5. Click Finish button*
**2** **3** **4** **5**

## Command: join usb-Wizard Mode

*1. Select Encoder Device Name*
*2.a Select Device(s)*
*2.a Select Decoder or Group name*
*3. Select Exclusive (optional)* **1**
*4. Click Finish button*
**2a**

**2b** **3** **4**

## Command: join kvm-Normal Mode

*2. Enter Encoder Device Name*
*3. Enter Decoder or Group name*
*4. Select Exclusive (optional)* **1**
*5. Select Video Mode (optional)*
**2**

*6. Click Finish button*
**3** **4** **5** **6**

## Command: join kvm-Wizard Mode

*1. Select Encoder Device Name*
*2.a Select Device(s)*
*2.b Select Decoder or Group name*
*3. Select Exclusive (optional)***1**
*4. Select Video Mode (optional)*
*5. Click Finish button*
**2a**

**2b** **3** **4** **5**

## Command: join wall-Normal Mode

*2. Enter Encoder Device Name*
*3. Enter Decoder Device Name*
*4. Select Wall Type* *eg 2x2*
*5. Select Display Position*
*6. Optionally change display* *resolution and framerate*
*6.a Enter Resolution Width*
*6.b Enter Resolution Height*
*6. c Enter Framerate*
*7.Optionally apply bezel* *compensation*
*7.a Enter Display Width*
*7.b Enter Viewable Height*
*7.c Enter Display Height*
*7.d Enter Viewable Height*
*8. Click Finish button*
**1** **2** **3** **4** **5** **6a** **6b** **6c** **7a** **7b** **7c** **7d** **8**

*1. Select Encoder Device Name*
*2. Select Decoder Device Name*
*3. Select Wall Type* *eg 2x2*
*4. Select Display Position*
*5. Select Video Mode*
*6. Optionally apply bezel* *compensation*
*6.a Enter Display Width*
*6.b Enter Viewable Height*
*6.c Enter Display Height*
*6.d Enter Viewable Height*
*7. Click Finish button*
**1** **2** **3** **4** **5** **6a** **6b** **6c** **6d** **7**

## Command: join wall-Wizard Mode

## Command: leave all-Normal Mode

*2. Enter Decoder or Group name*
*3. Click Finish button*
**1** **2** **3**

## Command: leave all-Wizard Mode

*1.a Select Device(s)*
*1.b Select Decoder or Group name*
*2. Click Finish button*
**1a**

**1b** **2**

## Command: leave av-Normal Mode

*1. Enter optional Security Key*
*2. Enter Decoder or Group name*
*3. Click Finish button*
**1** **2** **3**

## Command: leave av-Wizard Mode

*1.a Select Device(s)*
*1.b Select Decoder or Group name*
*2. Click Finish button*
**1a**

**1b**

## Command: leave video-Normal Mode

*2. Enter Decoder or Group name*
*3. Click Finish button*
**1** **2** **3**

## Command: leave video-Wizard Mode

*1.a Select Device(s)*
*1.b Select Decoder or Group name*
*2. Click Finish button*
**1a**

**1b** **2**

## Command: leave audio-Normal Mode

*1. Enter optional Security Key*
*2. Enter Decoder or Group name*
*3. Click Finish button*
**1** **2** **3**

## Command: leave audio-Wizard Mode

*1.a Select Device(s)*
*1.b Select Decoder or Group name*
*2. Click Finish button*
**1a**

**1b**

## Command: leave serial-Normal Mode

*2. Enter Decoder or Group name*
*3. Click Finish button*
**1** **2** **3**

## Command: leave serial-Wizard Mode

*1.a Select Device(s)*
*1.b Select Decoder or Group name*
*2. Click Finish button*
**1a**

**1b** **2**

## Command: leave ir-Normal Mode

*1. Enter optional Security Key*
*2. Enter Decoder or Group name*
*3. Click Finish button*
**1** **2** **3**

## Command: leave ir-Wizard Mode

*1.a Select Device(s)*
*1.b Select Decoder or Group name*
*2. Click Finish button*
**1a**

**1b** **2**

## Command: leave usb-Normal Mode

*2. Enter Decoder or Group name*
*3. Click Finish button*
**1** **2** **3**

## Command: leave usb-Wizard Mode

*1.a Select Device(s)*
*1.b Select Decoder or Group name*
*2. Click Finish button*
**1a**

**1b** **2**

## Command: leave kvm-Normal Mode

*1. Enter optional Security Key*
*2. Enter Decoder or Group name*
*3. Click Finish button*
**1** **2** **3**

## Command: leave kvm-Wizard Mode

*1.a Select Device(s)*
*1.b Select Decoder or Group name*
*2. Click Finish button*
**1a**

**1b**

## Command: stop-Normal Mode

*2. Enter Encoder*
*3. Click Finish button*
**1** **2** **3**

## Command: stop-Wizard Mode

*1. Select Encoder*
*2. Click Finish button*
**1** **2**

## Command: start-Normal Mode

*1. Enter optional Security Key*
*2. Enter Encoder*
*3. Click Finish button*
**1** **2** **3**

## Command: start-Wizard Mode

*1. Select Encoder*
*2. Click Finish button*
**1** **2**

## Command: reboot-Normal Mode

*2. Enter Device or Group name*
*3. Click Finish button*
**1** **2** **3**

## Command: reboot-Wizard Mode

*1.a Select Device(s)*
*1.b Select Decoder or Group name*
*2. Click Finish button*
**1a**

**1b** **2**

## Command: set audio_source-Normal Mode

*1. Enter optional Security Key*
*2. Enter Encoder Device Name*
*3. Select Audio Source:* *HDMI / ANALOG*
**1**

*4. Click Finish button*
**2** **3** **4**

## Command: set audio_source-Wizard Mode

*1. Select Encoder Device Name*
*2. Select Audio Source:* *HDMI / ANALOG*
*3. Click Finish button*
**1** **2**

## Command: set edid-Normal Mode

*2. Enter Encoder or Group name*
*3. Enter EDID string*
**1**

*4. Click Finish button*
**2** **3**

**4**

## Command: set edid-Wizard Mode

*1. Select Encoder or Group name*
**1**

*2. Select EDID type*
*2.a Select one:*
**2a** *Default EDID* *Decoder EDID* **2b** *User Defined*

*2.b Select External EDID*
**2c**

*2.c Enter User Defined EDID*
*3. Click Finish button*
**3**

## Command: set frame_converter` - Normal Mode

*2. Enter Encoder Device Name*
*3. Enter Frame rate*
*4. Click Finish button***1**
**2** **3** **4**

## Command: set frame_converter-Wizard Mode

*1. Enter Encoder Device Name*
*3. Select Frame Rate*
*3. Click Finish button*
**1** **2** **3**

*1. Select Encoder Device Name*
*2. Select Frame Rate* User Defined
*3. Select Frame Rate*
*4. Click Finish button*
**1** **2**

**3** **4**

## Command: set listener-Normal Mode

## Listener is OFF (disabled)

*2. Enter Multicast or Device IP*
*3. Enter Notify IP Port*
*4. Select Protocol UDP or TCP***1**
*5. Select Condition ON, OFF or ALL*
**2**

*6. Select State of listener*
*7. Select the device physically***3** *connected port*
*8. Click Finish button*
**4** **5** **6** **7** **8**

## Listener is ON (enabled)

*1. Enter optional Security Key*
*2. Enter Multicast or Device IP*
*3. Enter Notify IP Port*
*4. Select Protocol UDP or TCP***1**
*5. Select Condition ON, OFF or ALL*
**2**

*6. Select State of listener*
*7. Select the device physically***3** *connected port*
*8. Select Preset*
**4**

*9. Set delay time (optional)* **5**
*10. Click Finish button*
**6** **7** **8**

**9** **10**

## Command: set listener-Wizard Mode

*1. Select Device Discovery*
**1**

*2. Select Device*
**2**

*Command: set listener-Wizard Mode continued...*

## Listener is ON (enabled)

*3. Select the device port being used*
*4. Select Sensor Notify*
*5. Enter an unsued port number*
*6. Set Notify Timer to 0*
*7. Click Set button***3**
*8. Select Condition ON, OFF or ALL*
*9. Select State of listener*
**4**

*10. Select the preset to be executed* **5**
*11. Select an optional delay*
**6**

*12. Click Finish button*
**7**

**8** **9**

**10**

**11** **12**

*Command: set listener-Wizard Mode continued...*

## Listener is OFF (disabled)

*3. Select the device port being used*
*4. Select Condition ON, OFF or ALL*
*5. Select State of listener*
*5. Select the device physically* *connected port*
*6. Click Finish button***3**
**7**

**4** **5**

**6**

## Command: set rotation-Normal Mode

*2. Enter Decoder Device Name*
*3. Enter Rotation Method*
*4. Click Finish button***1**
**2** **3** **4**

## Command: set rotation-Wizard Mode

*1. Select Decoder Device Name*
*2. Select Rotation Method*
*3. Click Finish button*
**1** **2** **3**

## Command: set scaler-Normal Mode

*1. Enter optional Security Key*
*2. Enter Decoder Device Name*
*3. Enter Video Mode*
*4. Click Finish button***1**
**2** **3** **4**

## Command: set scaler-Wizard Mode

*1. Select Decoder Device Name*
*2. Select Video Mode*
*3. Click Finish button*
**1** **2**

## Command: set var-Normal Mode

*2. Enter Variable Name*
** MAX 256 characters*
**1**

*3. Enter value*
** MAX 256 characters*
**2**

*4. Click Finish button*
**3**

**4**

## Command: set var-Wizard Mode

*1. Select / Enter Variable Name*
** MAX 256 characters*
*2. Select Value or select Delete*
** MAX 256 characters*
*3. Click Finish button*
**1**

**2**

**3**

## Command: set video_mute-Normal Mode

*1. Enter optional Security Key*
*2. Enter Decoder Device Name*
*3. Select Option:* *Enabled / Disabled***1**
*4. Click Finish button*
**2** **3** **4**

## Command: set video_mute-Wizard Mode

*1. Select Decoder Device Name*
*2. Select Option:* *Enabled / Disabled*
*3. Click Finish button*
**1** **2**

## Command: set video_quality-Normal Mode

*2. Enter Encoder Device Name*
*3. Select Option: AUTO / 0..5*
**1**

*4. Click Finish button*
**2** **3** **4**

## Command: set video_quality-Wizard Mode

*1. Select Encoder Device Name*
*2. Select Option AUTO / 0..5*
*3. Click Finish button*
**1** **2** **3**

## Command: set volume-Normal Mode

*1. Enter optional Security Key*
*2. Enter Device Name*
*3. Select Volume level*
**1**

*4. Click Finish button*
**2**

**3**

**4**

## Command: set volume-Wizard Mode

*1. Select Device Name*
*2. Select Volume level*
*3. Click Finish button*
**1** **2**

## Command: get audio_source-Normal Mode

*2. Enter Encoder Device Name*
*3. Click Finish button*
**1** **2** **3**

## Command: get audio_source - Wizard Mode

*1. Select Encoder Device Name*
*2. Click Finish button*
**1** **2**

## Command: get devices-Normal Mode

*1. Enter optional Security Key*
*2. Select Device:* *ALL* *ALL DECODERS***1** *ALL ENCODERS*
*3. Click Finish button***2**
**3**

## Command: get devices- Wizard Mode

*1. Select Device:* *ALL* *ALL DECODERS* *ALL ENCODERS*
*2. Click Finish button*
**1** **2**

## Command: get display_status-Normal Mode

*2. Select Decoder*
*3. Click Finish button*
**1** **2** **3**

## Command: get display_status - Wizard Mode

*1. Select Decoder*
*2. Click Finish button*
**1** **2**

## Command: get edid-Normal Mode

*1. Enter optional Security Key*
*2. Enter Decoder Device Name*
*3. Click Finish button*
**1** **2** **3**

## Command: get edid- Wizard Mode

*1. Select Decoder Device Name*
*2. Click Finish button*
**1** **2**

## Command: get encoder-Normal Mode

*2. Enter Decoder Device Name*
*3. Select Subscription:* *VIDEO / AUDIO***1**
*4. Click Finish button*
**2** **3** **4**

## Command: get encoder - Wizard Mode

*1. Select Decoder Device Name*
*2. Select Subscription:* *VIDEO / AUDIO*
*3. Click Finish button*
**1** **2** **3**

## Command: get frame_converter-Normal Mode

*1. Enter optional Security Key*
*2. Enter Encoder Device Name*
*3. Click Finish button*
**1** **2** **3**

## Command: get frame_converter- Wizard Mode

*1. Select Encoder Device Name*
*2. Click Finish button*
**1** **2**

## Command: get preferred-Normal Mode

*2. Enter Decoder Device Name*
*3. Select Resolution:* *WIDTH / HEIGHT / FRAME RATE***1**
*4. Click Finish button*
**2** **3** **4**

## Command: get preferred - Wizard Mode

*1. Select Decoder Device Name*
*2. Select Resolution:* *WIDTH / HEIGHT / FRAME RATE*
*3. Click Finish button*
**1** **2** **3**

## Command: get rotation-Normal Mode

*1. Enter optional Security Key*
*2. Enter Decoder Device Name*
*3. Click Finish button*
**1** **2** **3**

## Command: get rotation- Wizard Mode

*1. Select Decoder Device Name*
*2. Click Finish button*
**1**

## Command: get scaler-Normal Mode

*2. Enter Decoder Device Name*
*3. Select Option:* *ALL / WIDTH /***1** *HEIGHT / FRAME RATE*
*4. Click Finish button***2**
**3** **4**

## Command: get scaler - Wizard Mode

*1. Select Decoder Device Name*
*2. Select Option:* *ALL / WIDTH /* *HEIGHT / FRAME RATE*
*3. Click Finish button*
**1** **2** **3**

## Command: get status-Normal Mode

*1. Enter optional Security Key*
*2. Enter Device Name*
*3. Select Streams:* *VIDEO / AUDIO /***1** *IR / SERIAL / USB*
*4. Click Finish button***2**
**3** **4**

## Command: get status- Wizard Mode

*1. Select Device Name*
*2. Select Streams:* *VIDEO / AUDIO /* *IR / SERIAL / USB*
*3. Click Finish button*
**1** **2**

## Command: get var-Normal Mode

*2. Enter Variable Name*
*3. Click Finish button*
**1** **2** **3**

## Command: get var - Wizard Mode

*1. Enter / Select Variable Name*
*2. Click Finish button*
**1** **2**

## Command: get ver-Normal Mode

*1. Enter optional Security Key*
*2. Select Device:* *ALL* *ALL DECODERS* *ALL ENCODERS***1**
*3. Click Finish button*
**2** **3**

## Command: get ver- Wizard Mode

*1. Select Device:* *ALL* *ALL DECODERS* *ALL ENCODERS*
*2. Click Finish button*
**1** **2**

## Command: get video-Normal Mode

*2. Enter Encoder Device Name*
*3. Select Option:* *ALL / WIDTH / HEIGHT***1** *FRAME RATE / SCAN MODE*
*4. Click Finish button***2**
**3** **4**

## Command: get video - Wizard Mode

*1. Select Encoder Device Name*
*2. Select Option:* *ALL / WIDTH / HEIGHT* *FRAME RATE / SCAN MODE*
*3. Click Finish button*
**1** **2** **3**

## Command: get video_mute-Normal Mode

*1. Enter optional Security Key*
*2. Select Device:* *ALL* *ALL DECODERS* *ALL ENCODERS***1**
*3. Click Finish button*
**2** **3**

## Command: get video_mute- Wizard Mode

*1. Select Device:* *ALL* *ALL DECODERS* *ALL ENCODERS*
*2. Click Finish button*
**1** **2**

## Command: get video_quality-Normal Mode

*2. Enter Encoder Device Name*
*3. Click Finish button*
**1** **2** **3**

## Command: get video_quality - Wizard Mode

*1. Select Encoder Device Name*
*2. Click Finish button*
**1** **2**

## Command: get video_status-Normal Mode

*1. Enter optional Security Key*
*2. Enter Encoder Device Name*
*3. Click Finish button*
**1** **2** **3**

## Command: get video_status- Wizard Mode

*1. Select Encoder Device Name*
*2. Click Finish button*
**1** **2**

## Command: get volume-Normal Mode

*2. Select Device*
*3. Click Finish button*
**1** **2** **3**

## Command: get volume - Wizard Mode

*1. Select Device*
*2. Click Finish button*
**1** **2**

## Command: send cec-Normal Mode

*2. Select Device*
*3. Enter CEC code*
*4. Click Finish button* **1**
**2** **3** **4**

## Command: send cec - Wizard Mode

*1. Select Device*
*2. Select / Enter CEC code*
*3. Click Finish button*
**1**

**2**

**3**

## Command: send gc-Normal Mode

*2. Enter device IP address*
*3. Select device port*
**1**

*4. Enter command string*
*5. Click Finish button* **2**
**3** **4** **5**

## Command: send gc - Wizard Mode

*1. Select Device, Click Device* *Discover or enter device IP address***1**
*2. Select device port*
**2**

*3. Disconnect (optional)*
**3**

*4. Enter command string or select* *Delete*
**4**

*5. Click Finish button*
**5**

## Command: send ir-Normal Mode

*2. Select Device*
*3. Enter IR code*
*4. Click Finish button*
**1** **2** **3**

**4**

## Command: send ir - Wizard Mode

*1. Select Device*
*2. Enter IR code*
*3. Click Finish button*
**1**

**2**

**3**

## Command: send serial-Normal Mode

*2. Enter Device*
*3. Enter Data String*
**1**

*4. Leave NONE selected* *(when no feedback required)*
**2**

*5. Click Finish button*
**3** **4** **5**

*1. Enter optional Security Key*
*2. Enter Device*
*3. Enter Data String*
**1**

*4. Select Reply* *(when feedback required)*
**2**

*5. Click Finish button*
**3** **4** **5**

*1. Enter optional Security Key*
*2. Enter Device*
*3. Enter Data String*
**1**

*4. Select Contains*
**2** *(when part feedback compared)*

*5. Enter compare string*
**3**

*6. Click Finish button*
**4** **5** **6**

*1. Enter optional Security Key*
*2. Enter Device*
*3. Enter Data String*
*4. Select Equals* *(when full feedback compared)*
*5. Enter compare string*
*6. Click Finish button*
**1** **2** **3** **4** **5** **6**

## Command: send serial-Wizard Mode

*1. Select Device*
*2. Select string format:* *ASCII / HEX*
*3. Enter Data String*
*4. Leave None selected* *(when no feedback required)*
*5. Click Finish button*
**1** **2** **3**

**4** **5**

*1. Select Device*
*2. Select string format:* *ASCII / HEX*
*3. Enter Data String*
*4. Select Reply* *(when feedback required)*
*5. Click Finish button*
**1**

**2** **3**

**4** **5**

*Command: send serial-Wizard Mode continued...*

*1. Select Device*
*2. Select string format:* *ASCII / HEX*
*3. Enter Data String*
*4. Select Contains* *(when part feedback compared)* **1**
*5. Enter compare string*
*6. Click Finish button* **2**
**3**

**4** **5**

**6**

*1. Select Device*
*2. Select string format* *ASCII / HEX*
*3. Enter Data String*
*4. Select Equals* *(when all feedback compared)* **1**
*5. Enter compare string*
*6. Click Finish button* **2**
**3**

**4** **5**

**6**

## Command: send tcp-Normal Mode

*2. Enter device IP Address*
*3. Enter device Port*
**1**

*4. Enter command string*
*5. Leave NONE selected* **2** *(when no feedback required)*
**3**

*6. Click Finish button*
**4** **5** **6**

*1. Enter optional Security Key*
*2. Enter device IP Address*
*3. Enter device Port*
**1**

*4. Enter command string*
*5. Select Reply***2** *(when feedback required)***3**
*6. Click Finish button*
**4** **5** **6**

*1. Enter optional Security Key*
*2. Enter device IP Address*
*3. Enter device Port*
**1**

*4. Enter command string*
**2**

*5. Select Contains* *(when part feedback compared)***3**
*6. Enter compare string* **4**
*7. Click Finish button***5**
**6** **7**

*1. Enter optional Security Key*
*2. Enter device IP Address*
*3. Enter device Port*
**1**

*4. Enter command string*
**2**

*5. Select Equals* *(when all feedback compared)***3**
*6. Enter compare string* **4**
*7. Click Finish button***5**
**6**

## Command: send tcp-Wizard Mode

*1. Enter device IP Address*
*2. Enter device Port*
*3. Select Format:* *ASCII / HEX*
*4. Enter command string* **1**
*5. Leave NONE selected*
**2** *(when no feedback required)*

*6. Click Finish button*
**3** **4**

**5** **6**

*1. Enter device IP Address*
*2. Enter device Port*
*3. Select Format* *ASCII / HEX*
*4. Enter command string* **1**
*5. Select Reply*
**2** *(when feedback required)*

*6. Click Finish button*
**3** **4**

**5** **6**

*Command: send tcp-Wizard Mode continued...*

*1. Enter device IP Address*
*2. Enter device Port*
*3. Select Format* *ASCII / HEX*
*4. Enter command string*
**1**

*5. Select Contains* *(when part feedback compared)***2**
*6. Enter compare string*
*7. Click Finish button*
**3** **4**

**5** **6**

**7**

*1. Enter device IP Address*
*2. Enter device Port*
*3. Select Format* *ASCII / HEX*
*4. Enter command string*
**1**

*5. Select Equals* *(when all feedback compared)***2**
*6. Enter compare string*
*7. Click Finish button*
**3** **4**

**5** **6**

**7**

## Command: preset add

*1. Enter Preset Name*
*2. Enter Preset Command*
*3. Click Finish button*
**1** **2** **3**

## Command: preset delete

*1. Select Preset Name*
*2. Click Finish button*
**1** **2**

## Command: preset load

*1. Select Preset Name*
*2. Select optional delay time* *or select Cancel*
*3. Click Finish button*
**1**

**2**

**3**

## Command: set ui_button-Normal Mode

*2. Enter UI Name*
*3. Enter Button Name*
*4. Select Function:***1** *Position / State / Text / Press*
**2**

*5. Enter Value*
*6. Click Finish button* **3**
**4** **5** **6**

## Command: set ui_button - Wizard Mode

*1. Select UI Name*
*2. Select Button Name*
*3. Select Function* *State / Text / Press*
*4. Click Finish button*
**1** **2** **3** **4**

## Command: set ui_label-Normal Mode

*2. Enter UI Name*
*3. Enter Label Name*
*4. Select Function***1** *Color / Visibility / Text*
**2**

*5. Enter Value*
*6. Click Finish button***3**
**4** **5** **6**

## Command: set ui_label - Wizard Mode

*1. Select UI Name*
*2. Select Label Name*
*3. Select Function* *Color / Visibility / Text*
*4. Click Finish button***1**
**2** **3** **4**

## Command: set ui_image-Normal Mode

*2. Enter UI Name*
*3. Enter Image Name*
**1**

*4. Select Function* *Visibility***2**
*5. Enter Value*
**3**

*6. Click Finish button*
**4** **5** **6**

## Command: set ui_image - Wizard Mode

*1. Select UI Name*
*2. Select Image Name*
*3. Select Function* *Visibility*
*4. Click Finish button*
**1** **2** **3** **4**

## Command: set ui_page- Normal Mode

*2. Enter UI Name*
*3. Enter Page Name*
*4. Click Finish button*
**1** **2** **3** **4**

## Command: set ui_page - Wizard Mode

*1. Select UI Name*
*2. Select Page Name*
*3. Click Finish button*
**1** **2** **3**

## Command: set ui-Normal Mode

*2. Enter UI Name*
*3. Select Service > Enabled*
*4. Enter optional UI Timeout*
**1** *(seconds)*

*5. Enter optional Client Limit* **2** *(1 – 100)*
*6. Enter optional 4 digit code* **3** *(0000 – 9999)*
*7. Click Finish button***4**
**5** **6** **7**

*1. Enter optional Security Key*
*2. Enter UI Name*
*3. Select Service > Disabled*
*4. Click Finish button*
**1** **2** **3** **4**

*1. Enter optional Security Key*
*2. Enter UI Name*
*3. Select Service > Logout*
*4. Click Finish button*
**1** **2** **3** **4**

## Command: set ui-Wizard Mode

*1. Select UI Name*
*2. Select Service > Enabled*
*3. Select optional UI Timeout* *(seconds)*
*4. Enter optional Client Limit* *(1 – 100)***1**
*5. Select optional Login:*
**2** *Random / Fixed*

*6. Click Finish button***3**
**4** **5** **6**

*1. Select UI Name*
*2. Select Service > Disabled*
*3. Click Finish button*
**1** **2**

**3**

*1. Select UI Name*
*2. Select Service > Logout*
*3. Click Finish button*
**1** **2**

**3**

## Command: get ui-Normal Mode

*2. Enter UI Name*
*3. Click Finish button*
**1** **2** **3**

## Command: get ui - Wizard Mode

*1. Select UI Name*
*2. Click Finish button*
**1** **2**

## Command: get ui_button-Normal Mode

*1. Enter optional Security Key*
*2. Enter UI Name*
*3. Enter Button Name*
*4. Enter Function > down***1**
*5. Click Finish button* **2**
**3** **4** **5**

## Command: get ui_button-Wizard Mode

*1. Select UI Name*
*2. Select Button Name*
*3. Select Function > Down*
*4. Click Finish button*
**1** **2** **3** **4**

Phone: 719-260-0061 Fax: 719-260-0075 Toll-Free: 800-530-8998 Email: supportlibav@libav.com
