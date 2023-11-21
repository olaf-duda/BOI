import Bike from './Bike'

interface Station {
    geoCoords : {
      lng : number,
      lat : number
    },
    uid : number,
    name : string,
    bikes : Bike[]
};

export default Station;
