import {Event} from '../../../event';
import {Activity} from '../../../../activities/activity';
import {Creator} from '../../../../creators/creator';
import {Lap} from '../../../../laps/lap';
import {Point} from '../../../../points/point';
import {DataAltitude} from '../../../../data/data.altitude';
import {DataCadence} from '../../../../data/data.cadence';
import {DataHeartRate} from '../../../../data/data.heart-rate';
import {DataSpeed} from '../../../../data/data.speed';
import {DataVerticalSpeed} from '../../../../data/data.vertical-speed';
import {DataTemperature} from '../../../../data/data.temperature';
import {DataSeaLevelPressure} from '../../../../data/data.sea-level-pressure';
import {EventInterface} from '../../../event.interface';
import {DataLatitudeDegrees} from '../../../../data/data.latitude-degrees';
import {DataLongitudeDegrees} from '../../../../data/data.longitude-degrees';
import {DataPower} from '../../../../data/data.power';
import {DataGPSAltitude} from '../../../../data/data.altitude-gps';
import {DataAbsolutePressure} from '../../../../data/data.absolute-pressure';
import {DataEHPE} from '../../../../data/data.ehpe';
import {DataEVPE} from '../../../../data/data.evpe';
import {DataNumberOfSatellites} from '../../../../data/data.number-of-satellites';
import {DataSatellite5BestSNR} from '../../../../data/data.satellite-5-best-snr';
import {IntensityZones} from '../../../../intensity-zones/intensity-zones';
import {IBIData} from '../../../../data/ibi/data.ibi';
import {PointInterface} from '../../../../points/point.interface';
import {ImporterSuuntoActivityIds} from './importer.suunto.activity.ids';
import {ImporterSuuntoDeviceNames} from './importer.suunto.device.names';
import {ActivityInterface} from '../../../../activities/activity.interface';
import {LapInterface} from '../../../../laps/lap.interface';
import {DataInterface} from '../../../../data/data.interface';
import {DataDuration} from '../../../../data/data.duration';
import {DataAltitudeMax} from '../../../../data/data.altitude-max';
import {DataDistance} from '../../../../data/data.distance';
import {DataAscentTime} from '../../../../data/data.ascent-time';
import {DataDescentTime} from '../../../../data/data.descent-time';
import {DataDescent} from '../../../../data/data.descent';
import {DataAscent} from '../../../../data/data.ascent';
import {DataEPOC} from '../../../../data/data.epoc';
import {DataEnergy} from '../../../../data/data.energy';
import {DataFeeling} from '../../../../data/data.feeling';
import {DataPeakTrainingEffect} from '../../../../data/data.peak-training-effect';
import {DataRecovery} from '../../../../data/data.recovery';
import {DataVO2Max} from '../../../../data/data.vo2-max';
import {DataPause} from '../../../../data/data.pause';
import {DataHeartRateAvg} from '../../../../data/data.heart-rate-avg';
import {DataHeartRateMax} from '../../../../data/data.heart-rate-max';
import {DataHeartRateMin} from '../../../../data/data.heart-rate-min';
import {DataCadenceAvg} from '../../../../data/data.cadence-avg';
import {DataCadenceMax} from '../../../../data/data.cadence-max';
import {DataCadenceMin} from '../../../../data/data.cadence-min';
import {DataPowerAvg} from '../../../../data/data.power-avg';
import {DataPowerMax} from '../../../../data/data.power-max';
import {DataPowerMin} from '../../../../data/data.power-min';
import {DataSpeedAvg} from '../../../../data/data.speed-avg';
import {DataSpeedMax} from '../../../../data/data.speed-max';
import {DataSpeedMin} from '../../../../data/data.speed-min';
import {DataTemperatureAvg} from '../../../../data/data.temperature-avg';
import {DataTemperatureMax} from '../../../../data/data.temperature-max';
import {DataTemperatureMin} from '../../../../data/data.temperature-min';
import {DataVerticalSpeedAvg} from '../../../../data/data.vertical-speed-avg';
import {DataVerticalSpeedMax} from '../../../../data/data.vertical-speed-max';
import {DataVerticalSpeedMin} from '../../../../data/data.vertical-speed-min';
import {DataAltitudeAvg} from '../../../../data/data.altitude-avg';
import {DataAltitudeMin} from '../../../../data/data.altitude-min';
import {DataFusedLocation} from '../../../../data/data.fused-location';
import {ActivityTypes} from '../../../../activities/activity.types';
import {convertSpeedToPace, EventUtilities, isNumberOrString} from '../../../utilities/event.utilities';
import {LapTypes} from '../../../../laps/lap.types';
import {DataPace} from '../../../../data/data.pace';
import {DataPaceAvg} from '../../../../data/data.pace-avg';
import {DataPaceMax} from '../../../../data/data.pace-max';
import {DataPaceMin} from '../../../../data/data.pace-min';
import {DataFusedAltitude} from '../../../../data/data.fused-altitude';
import {DataBatteryCharge} from '../../../../data/data.battery-charge';
import {DataBatteryCurrent} from '../../../../data/data.battery-current';
import {DataBatteryVoltage} from '../../../../data/data.battery-voltage';
import {Stream} from '../../../../streams/stream';

export class EventImporterSuuntoJSON {

  static getFromJSONString(jsonString: string): Promise<EventInterface> {

    return new Promise((resolve, reject) => {

      const eventJSONObject = JSON.parse(jsonString);

      debugger;

      // Create a creator and pass it to all activities (later)
      const creator = new Creator(
        ImporterSuuntoDeviceNames[eventJSONObject.DeviceLog.Device.Name] // Try to get a listed name
        || eventJSONObject.DeviceLog.Device.Name, // If not fallback to typed
      );
      creator.serialNumber = eventJSONObject.DeviceLog.Device.SerialNumber;
      creator.hwInfo = eventJSONObject.DeviceLog.Device.Info.HW;
      creator.swInfo = eventJSONObject.DeviceLog.Device.Info.SW;

      // Go over the samples and get the ones with activity start times
      const activityStartEventSamples = eventJSONObject.DeviceLog.Samples.filter((sample: any) => {
        return sample.Events && sample.Events[0].Activity;
      });

      // Check if there is a Fused Altitude event
      const fusedAltitudeEventSamples = eventJSONObject.DeviceLog.Samples.filter((sample: any) => {
        return sample.Events && sample.Events[0].Altitude;
      });

      // Get the lap start events
      const lapEventSamples = eventJSONObject.DeviceLog.Samples.filter((sample: any) => {
        return sample.Events && sample.Events[0].Lap && sample.Events[0].Lap.Type !== 'Start' && sample.Events[0].Lap.Type !== 'Stop';
      });

      // Get the stop event
      const stopEventSample = eventJSONObject.DeviceLog.Samples.find((sample: any) => {
        return sample.Events && sample.Events[0].Lap && sample.Events[0].Lap.Type === 'Stop';
      });

      // Add the stop event to the laps since it's also a lap stop event
      if (stopEventSample) {
        lapEventSamples.push(stopEventSample);
      }

      // Get the activity windows
      const activityWindows = eventJSONObject.DeviceLog.Windows.filter((windowObj: any) => {
        return windowObj.Window.Type === 'Activity';
      }).map((activityWindow: any) => activityWindow.Window);

      // Get the lap windows
      const lapWindows = eventJSONObject.DeviceLog.Windows.filter((windowObj: any) => {
        return windowObj.Window.Type === 'Lap' || windowObj.Window.Type === 'Autolap';
      }).map((lapWindow: any) => lapWindow.Window);

      // Create the activities
      const activities: ActivityInterface[] = activityStartEventSamples.map((activityStartEventSample: any, index: number): ActivityInterface => {
        const activity = new Activity(
          new Date(activityStartEventSample.TimeISO8601),
          activityStartEventSamples.length - 1 === index ?
            new Date(stopEventSample ? stopEventSample.TimeISO8601 : eventJSONObject.DeviceLog.Header.TimeISO8601) :
            new Date(activityStartEventSamples[index + 1].TimeISO8601),
          ActivityTypes[<keyof typeof ActivityTypes>ImporterSuuntoActivityIds[activityStartEventSample.Events[0].Activity.ActivityType]],
          creator,
        );

        // Set the end date to the stop event time if the activity is the last or the only one else set it on the next itery time
        // Create the stats these are a 1:1 ref arrays
        if (activityWindows[index]) {
          this.getStats(activityWindows[index]).forEach((stat) => {
            activity.addStat(stat)
          });
        }
        // Add the pause from end date minurs start date and removing the duration as widows do not contain the pause time
        if (!activity.getDuration()) {
          activity.setDuration(new DataDuration((activity.endDate.getTime() - activity.startDate.getTime()) / 1000));
        }
        activity.setPause(new DataPause((activity.endDate.getTime() - activity.startDate.getTime()) / 1000 - activity.getDuration().getValue()));
        // Set the zones for the activity @todo fix
        this.setIntensityZones(activity, eventJSONObject.DeviceLog.Header);

        // Add the fused altitude event
        if (fusedAltitudeEventSamples.length) {
          activity.addStat(new DataFusedAltitude(true))
        } else {
          activity.addStat(new DataFusedAltitude(false))
        }

        return activity;

      });

      // set the start dates of all lap types to the start of the first activity
      const lapStartDatesByType = lapEventSamples.reduce((lapStartDatesByTypeObject: any, lapEventSample: any, index: number) => {
        // If its a stop event then set the start date to the previous
        if (lapEventSample.Events[0].Lap.Type === 'Stop' && lapEventSamples.length > 1) {
          lapStartDatesByTypeObject[lapEventSample.Events[0].Lap.Type] = new Date(lapEventSamples[index - 1].TimeISO8601);
          return lapStartDatesByTypeObject
        }
        lapStartDatesByTypeObject[lapEventSample.Events[0].Lap.Type] = activities[0].startDate;
        return lapStartDatesByTypeObject;
      }, {});
      const laps = lapEventSamples.reduce((lapArray: LapInterface[], lapEventSample: any, index: number): LapInterface[] => {
        // if there is only one lap then skip it's the whole activity
        if (lapEventSamples.length === 1) {
          return lapArray;
        }
        // Set the end date
        const lapEndDate = new Date(lapEventSample.TimeISO8601);
        // Set the start date.
        // Set it for the next run
        // @todo here is the real info LapTypes[lapEventSample.Events[0].Lap.Type
        const lap = new Lap(lapStartDatesByType[lapEventSample.Events[0].Lap.Type], lapEndDate, LapTypes[<keyof typeof LapTypes>lapEventSample.Events[0].Lap.Type]);
        lapStartDatesByType[lapEventSample.Events[0].Lap.Type] = lapEndDate;

        if (lapWindows[index]) {
          this.getStats(lapWindows[index]).forEach((stat) => {
            lap.addStat(stat);
          });
        }
        // Add the pause from end date minurs start date and removing the duration as widows do not contain the pause time
        if (!lap.getDuration()) {
          lap.setDuration(new DataDuration((lap.endDate.getTime() - lap.startDate.getTime()) / 1000));
        }
        lap.setPause(new DataPause((lap.endDate.getTime() - lap.startDate.getTime()) / 1000 - lap.getDuration().getValue()));
        lapArray.push(lap);
        return lapArray;
      }, []);

      // Add the laps to the belonging activity. If a lap starts or stops at the activity date delta then it belong to the acitvity
      // @todo move laps to event so we don't have cross border laps to acivities and decouple them
      activities.forEach((activity: ActivityInterface) => {
        laps.filter((lap: LapInterface) => {
          // If the lap start belongs to the activity
          if (lap.startDate <= activity.endDate && lap.startDate >= activity.startDate) {
            return true;
          }
          // if the lap end belongs also...
          if (lap.endDate >= activity.startDate && lap.endDate <= activity.endDate) {
            return true
          }
          return false;
        }).forEach((activityLap: LapInterface) => {
          activity.addLap(activityLap);
        });
      });

      // Add the samples that belong to the activity and the ibi data.
      activities.forEach((activity: ActivityInterface) => {

        // Get the samples that belong to this activity
        const activitySamples = eventJSONObject
          .DeviceLog
          .Samples
          .filter((sample: any) => ((new Date(sample.TimeISO8601) >= activity.startDate) && (new Date(sample.TimeISO8601) <= activity.endDate)))

        // Check if there is fused Alti
        activity.addStat(new DataFusedLocation(false));
        activity.addStat(new DataFusedLocation(activitySamples.filter((sample: any) => this.hasFusedLocData(sample)).length > 0));

        // Clean up the samples from other data etc
        //   .filter((sample: any) => !sample.Debug && !sample.Events) // Filter real samples

        // Should filter on type and create the samples
        this.setStreamsForActivity(activity, activitySamples);

        // Maybe should do dev test for lat,long stuff
      });

      // Add the ibiData
      if (eventJSONObject.DeviceLog['R-R'] && eventJSONObject.DeviceLog['R-R'].Data) {
        // prepare the data array per activity removing the offset
        activities.forEach((activity: ActivityInterface) => {
          let timeSum = 0;
          const ibiData = eventJSONObject.DeviceLog['R-R'].Data.filter((ibi: number) => {
            timeSum += ibi;
            const ibiDataDate = new Date(activities[0].startDate.getTime() + timeSum);
            return ibiDataDate >= activity.startDate && ibiDataDate <= activity.endDate;
          });
          this.setIBIData(activity, ibiData)
        });
      }

      // Add the activities to the event
      activities.forEach((activity: ActivityInterface) => activity.sortPointsByDate());

      // Create an event
      // @todo check if start and end date can derive from the json
      const event = new Event('', activities[0].startDate, activities[activities.length - 1].endDate);
      activities.forEach(activity => event.addActivity(activity));
      // Populate the event stats from the Header Object
      this.getStats(eventJSONObject.DeviceLog.Header).forEach((stat) => {
        event.addStat(stat)
      });

      // Generate stats
      EventUtilities.generateStats(event);

      resolve(event);
    });
  }

  private static hasFusedLocData(sample: any): boolean {
    return !!sample.Inertial || !!sample.GpsRef;
  }

  private static setIntensityZones(activity: ActivityInterface, object: any) {
    SuuntoIntensityZonesMapper.forEach((intensityZonesMap) => {
      if (!object[intensityZonesMap.sampleField]) {
        return;
      }
      const zones = new IntensityZones(intensityZonesMap.dataType);
      zones.zone1Duration = object[intensityZonesMap.sampleField].Zone1Duration;
      zones.zone2Duration = object[intensityZonesMap.sampleField].Zone2Duration;
      zones.zone2LowerLimit = intensityZonesMap.convertSampleValue(object[intensityZonesMap.sampleField].Zone2LowerLimit);
      zones.zone3Duration = object[intensityZonesMap.sampleField].Zone3Duration;
      zones.zone3LowerLimit = intensityZonesMap.convertSampleValue(object[intensityZonesMap.sampleField].Zone3LowerLimit);
      zones.zone4Duration = object[intensityZonesMap.sampleField].Zone4Duration;
      zones.zone4LowerLimit = intensityZonesMap.convertSampleValue(object[intensityZonesMap.sampleField].Zone4LowerLimit);
      zones.zone5Duration = object[intensityZonesMap.sampleField].Zone5Duration;
      zones.zone5LowerLimit = intensityZonesMap.convertSampleValue(object[intensityZonesMap.sampleField].Zone5LowerLimit);
      activity.intensityZones.push(zones)
    });
  }

  // @todo fix this for multiple activities or attach the ibi data to the event
  private static setIBIData(activity: ActivityInterface, ibiData: number[]) {
    activity.ibiData = new IBIData(ibiData);
    // @todo optimize
    // Create a second IBIData so we can have filtering on those with keeping the original
    (new IBIData(ibiData))
      .lowLimitBPMFilter()
      .highLimitBPMFilter()
      .lowPassFilter()
      .movingMedianFilter()
      .getAsBPM().forEach((value, key, map) => {
      const point = new Point(new Date(activity.startDate.getTime() + key));
      point.addData(new DataHeartRate(value));

      // If it belongs to the activity add it
      if (point.getDate() >= activity.startDate && point.getDate() <= activity.endDate) {
        activity.addPoint(point);
      } else {
        debugger;
      }
    });
  }

  private static setStreamsForActivity(activity: ActivityInterface, samples: any[]): void {
    SuuntoSampleMapper.forEach((map) => {
      const subjectSamples = samples.filter((sample) => isNumberOrString(sample[map.sampleField]));
      if (subjectSamples.length) {
        activity.streams.push(new Stream(
          map.dataType,
          subjectSamples.reduce((array, sample) => {
            array[Math.ceil((+(new Date(sample.TimeISO8601)) - +activity.startDate) / 1000)] = map.convertSampleValue(sample[map.sampleField]);
            return array;
          }, Array(Math.ceil((+activity.endDate - +activity.startDate) / 1000))),
        ))
      }
    });
    return;
  }

  // @todo convert this to a mapping as well
  private static getStats(object: any): DataInterface[] {
    const stats = [];
    if (isNumberOrString(object.Distance)) {
      stats.push(new DataDistance(object.Distance));
    }
    if (isNumberOrString(object.AscentTime)) {
      stats.push(new DataAscentTime(object.AscentTime));
    }

    if (isNumberOrString(object.DescentTime)) {
      stats.push(new DataDescentTime(object.DescentTime));
    }

    if (isNumberOrString(object.Ascent)) {
      stats.push(new DataAscent(object.Ascent));
    }

    if (isNumberOrString(object.Descent)) {
      stats.push(new DataDescent(object.Descent));
    }

    if (isNumberOrString(object.EPOC)) {
      stats.push(new DataEPOC(object.EPOC));
    }

    if (isNumberOrString(object.Energy)) {
      stats.push(new DataEnergy(object.Energy * 0.239 / 1000));
    }

    if (isNumberOrString(object.Feeling)) {
      stats.push(new DataFeeling(object.Feeling));
    }

    if (isNumberOrString(object.PeakTrainingEffect)) {
      stats.push(new DataPeakTrainingEffect(object.PeakTrainingEffect));
    }
    if (isNumberOrString(object.RecoveryTime)) {
      stats.push(new DataRecovery(object.RecoveryTime));
    }
    if (isNumberOrString(object.MAXVO2)) {
      stats.push(new DataVO2Max(object.MAXVO2));
    }

    let pauseDuration = 0;
    if (isNumberOrString(object.PauseDuration)) {
      pauseDuration = object.PauseDuration;
    }
    stats.push(new DataPause(pauseDuration));
    stats.push(new DataDuration(object.Duration - pauseDuration));

    // double case
    if (Array.isArray(object.Altitude)) {
      if (object.Altitude[0].Avg !== null) {
        stats.push(new DataAltitudeAvg(object.Altitude[0].Avg));
      }
      if (object.Altitude[0].Max !== null) {
        stats.push(new DataAltitudeMax(object.Altitude[0].Max));
      }
      if (object.Altitude[0].Min !== null) {
        stats.push(new DataAltitudeMin(object.Altitude[0].Min));
      }
    } else if (object.Altitude) {
      if (object.Altitude.Max !== null) {
        stats.push(new DataAltitudeMax(object.Altitude.Max));
      }
      if (object.Altitude.Min !== null) {
        stats.push(new DataAltitudeMin(object.Altitude.Min));
      }
    }

    if (object.HR) {
      if (object.HR[0].Avg !== null) {
        stats.push(new DataHeartRateAvg(object.HR[0].Avg * 60));
      }
      if (object.HR[0].Max !== null) {
        stats.push(new DataHeartRateMax(object.HR[0].Max * 60));
      }
      if (object.HR[0].Min !== null) {
        stats.push(new DataHeartRateMin(object.HR[0].Min * 60));
      }
    }

    if (object.Cadence) {
      if (object.Cadence[0].Avg !== null) {
        stats.push(new DataCadenceAvg(object.Cadence[0].Avg * 60));
      }
      if (object.Cadence[0].Max !== null) {
        stats.push(new DataCadenceMax(object.Cadence[0].Max * 60));
      }
      if (object.Cadence[0].Min !== null) {
        stats.push(new DataCadenceMin(object.Cadence[0].Min * 60));
      }
    }

    if (object.Power) {
      if (object.Power[0].Avg !== null) {
        stats.push(new DataPowerAvg(object.Power[0].Avg));
      }
      if (object.Power[0].Max !== null) {
        stats.push(new DataPowerMax(object.Power[0].Max));
      }
      if (object.Power[0].Min !== null) {
        stats.push(new DataPowerMin(object.Power[0].Min));
      }
    }

    if (object.Speed) {
      if (object.Speed[0].Avg !== null) {
        stats.push(new DataSpeedAvg(object.Speed[0].Avg));
        stats.push(new DataPaceAvg(convertSpeedToPace(object.Speed[0].Avg)));
      }
      if (object.Speed[0].Max !== null) {
        stats.push(new DataSpeedMax(object.Speed[0].Max));
        stats.push(new DataPaceMax(convertSpeedToPace(object.Speed[0].Max)));
      }
      if (object.Speed[0].Min !== null) {
        stats.push(new DataSpeedMin(object.Speed[0].Min));
        stats.push(new DataPaceMin(convertSpeedToPace(object.Speed[0].Min)));
      }
    }

    if (object.Temperature) {
      if (object.Temperature[0].Avg !== null) {
        stats.push(new DataTemperatureAvg(object.Temperature[0].Avg - 273.15));
      }
      if (object.Temperature[0].Max !== null) {
        stats.push(new DataTemperatureMax(object.Temperature[0].Max - 273.15));
      }
      if (object.Temperature[0].Min !== null) {
        stats.push(new DataTemperatureMin(object.Temperature[0].Min - 273.15));
      }
    }

    if (object.hasOwnProperty('VerticalSpeed')) {
      // Double action here
      if (Array.isArray(object.VerticalSpeed)) {
        if (object.VerticalSpeed[0].Avg !== null) {
          stats.push(new DataVerticalSpeedAvg(object.VerticalSpeed[0].Avg));
        }
        if (object.VerticalSpeed[0].Max !== null) {
          stats.push(new DataVerticalSpeedMax(object.VerticalSpeed[0].Max));
        }
        if (object.VerticalSpeed[0].Min !== null) {
          stats.push(new DataVerticalSpeedMin(object.VerticalSpeed[0].Min));
        }
      } else {
        if (object.VerticalSpeed !== null) {
          stats.push(new DataVerticalSpeedAvg(object.VerticalSpeed));
        }
      }
    }
    return stats;
  }
}

export const SuuntoIntensityZonesMapper = [
  {
    dataType: DataHeartRate.type,
    sampleField: 'HrZones',
    convertSampleValue: (value: number) => Number(value * 60),
  },
  {
    dataType: DataPower.type,
    sampleField: 'PowerZones',
    convertSampleValue: (value: number) => Number(value),
  },
  {
    dataType: DataSpeed.type,
    sampleField: 'SpeedZones',
    convertSampleValue: (value: number) => Number(value),
  },
];

export const SuuntoSampleMapper = [
  {
    dataType: DataLatitudeDegrees.type,
    sampleField: 'Latitude',
    convertSampleValue: (value: number) => Number(value * (180 / Math.PI)),
  },
  {
    dataType: DataLongitudeDegrees.type,
    sampleField: 'Longitude',
    convertSampleValue: (value: number) => Number(value * (180 / Math.PI)),
  },
  {
    dataType: DataHeartRate.type,
    sampleField: 'HR',
    convertSampleValue: (value: number) => Number(value * 60),
  },
  {
    dataType: DataDistance.type,
    sampleField: 'Distance',
    convertSampleValue: (value: number) => Number(value),
  },
  {
    dataType: DataAbsolutePressure.type,
    sampleField: 'AbsPressure',
    convertSampleValue: (value: number) => Number(value / 100),
  },
  {
    dataType: DataSeaLevelPressure.type,
    sampleField: 'SeaLevelPressure',
    convertSampleValue: (value: number) => Number(value / 100),
  },
  {
    dataType: DataGPSAltitude.type,
    sampleField: 'GPSAltitude',
    convertSampleValue: (value: number) => Number(value),
  },
  {
    dataType: DataAltitude.type,
    sampleField: 'Altitude',
    convertSampleValue: (value: number) => Number(value),
  },
  {
    dataType: DataCadence.type,
    sampleField: 'Cadence',
    convertSampleValue: (value: number) => Number(value),
  },
  {
    dataType: DataPower.type,
    sampleField: 'Power',
    convertSampleValue: (value: number) => Number(value),
  },
  {
    dataType: DataSpeed.type,
    sampleField: 'Speed',
    convertSampleValue: (value: number) => Number(value),
  },
  {
    dataType: DataPace.type,
    sampleField: 'Speed',
    convertSampleValue: (value: number) => Number(convertSpeedToPace(value)),
  },
  {
    dataType: DataTemperature.type,
    sampleField: 'Temperature',
    convertSampleValue: (value: number) => Number(value - 273.15),
  },
  {
    dataType: DataVerticalSpeed.type,
    sampleField: 'VerticalSpeed',
    convertSampleValue: (value: number) => Number(value),
  },
  {
    dataType: DataEHPE.type,
    sampleField: 'EHPE',
    convertSampleValue: (value: number) => Number(value),
  },
  {
    dataType: DataEVPE.type,
    sampleField: 'EVPE',
    convertSampleValue: (value: number) => Number(value),
  },
  {
    dataType: DataNumberOfSatellites.type,
    sampleField: 'NumberOfSatellites',
    convertSampleValue: (value: number) => Number(value),
  },
  {
    dataType: DataSatellite5BestSNR.type,
    sampleField: 'Satellite5BestSNR',
    convertSampleValue: (value: number) => Number(value),
  },
  {
    dataType: DataBatteryCharge.type,
    sampleField: 'BatteryCharge',
    convertSampleValue: (value: number) => Number(value * 100),
  },
  {
    dataType: DataBatteryCurrent.type,
    sampleField: 'BatteryCurrent',
    convertSampleValue: (value: number) => Number(value),
  },
  {
    dataType: DataBatteryVoltage.type,
    sampleField: 'BatteryVoltage',
    convertSampleValue: (value: number) => Number(value),
  },
];
