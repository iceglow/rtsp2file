# RTSP2File
Simple service to asynchronously start consumption of a stream using the Real Time Streaming Protocol (RTSP) and save it to file via API.

## Getting started
There are some requirements in order to get this running.

### Config
The service expects a config file 'config.yml' to exist in the location /app/config/ or otherwise specified in the env variable 'RTSP2FILE_CONFIG'.

#### Config sample
An example _config.json_ can look like this:
```yaml
ftp:
  host: "ftp.gluffs.eu"
  user: "cctv"
  password: "secret_pass"
  secure: true
```

### Environment variables
Variable | Description | Default value
-------- | ----------- | -------------
PORT | Exposed port of the API | 80
RTSP2FILE_CONFIG | Config file location | /app/config/config.json
RTSP2FILE_CACHE | Cache path | /app/cache

### Volumes
_/app/config_ - config location
_/app/cache_ - cache location, used to cache vido files before uploading

### Start the container
```shell
docker run -p 80:80 -v /path/to/config/:/app/config -v /path/to/cache/:/app/cache iceglow/rtsp2file:latest
```

### Use the API
Sample call

```shell
curl --location --request POST '127.0.0.1:80/record' \
--header 'Content-Type: application/json' \
--data-raw '{
    "source_name": "MySource",
    "stream_url": "rtsp://user:pass@camera.example.com:554/cam/realmonitor?channel=1&subtype=0&unicast=true&proto=Onvif",
    "duration": 30,
    "part_duration": 10    
}'
```

## Source
Interested in cloning or contributing? check out the source at [GitHub](https://github.com/iceglow/rtsp2file) 

## Credits
Credits should go to [openRTSP](http://www.live555.com/openRTSP/) for providing such an awesome tool!
Credit as well to the maintainers of all used [dependencies](package.json).

## Buy me a coffee
Find it useful? Please consider buying me or other contributors a coffee.

<a href="https://www.buymeacoffee.com/iceglow" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>