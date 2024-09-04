async function getCitiesFromProjects() {
    try {
        const response = await fetch('/projects');
        const projects = await response.json();
        if (projects.length > 0) {
            return projects.map(project => ({ city: project.city, image: project.image_upload }));
        } else {
            throw new Error("No projects found");
        }
    } catch (error) {
        console.error("Error fetching cities:", error);
        return [];
    }
}

async function getCityCoordinates(city) {
    try {
        const response = await fetch(`/getCityCoordinates?city=${encodeURIComponent(city)}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching coordinates for city ${city}:`, error);
        return {};
    }
}

function loadMapScenario() {
    getCitiesFromProjects().then(cities => {
        if (cities.length === 0) {
            console.error("No cities to display on the map");
            return;
        }
        
        const map = new Microsoft.Maps.Map('#map', {
            center: new Microsoft.Maps.Location(0, 0),
            zoom:5,
            mapTypeId: Microsoft.Maps.MapTypeId.aerial 
        });

        const imagePopup = document.getElementById('image-popup');
        
        const locationPromises = cities.map(city => getCityCoordinates(city.city));
        
        Promise.all(locationPromises).then(coordinatesList => {
            coordinatesList.forEach((coordinates, index) => {
                if (coordinates.latitude && coordinates.longitude) {
                    const location = new Microsoft.Maps.Location(coordinates.latitude, coordinates.longitude);
                    const pushpin = new Microsoft.Maps.Pushpin(location, { title: cities[index].city });
                    map.entities.push(pushpin);
                    
                    Microsoft.Maps.Events.addHandler(pushpin, 'mouseover', function (e) {
                        if (e.target instanceof Microsoft.Maps.Pushpin) {
                            imagePopup.style.display = 'block';
                            const point = map.tryLocationToPixel(location, Microsoft.Maps.PixelReference.control);
                            imagePopup.style.left = `${point.x}px`;
                            imagePopup.style.top = `${point.y + 1001}px`; 
                            imagePopup.innerHTML = `<img src="${cities[index].image}" alt="City Image">`;
                        }
                    });
                    
                    Microsoft.Maps.Events.addHandler(pushpin, 'mouseout', function () {
                        imagePopup.style.display = 'none';
                    });
                    
                    if (index === 0) {
                        map.setView({ bounds: Microsoft.Maps.LocationRect.fromCorners(location, location) });
                    } else {
                        const bounds = map.getBounds();
                        bounds.extend(location);
                        // map.setView({ bounds: bounds });
                        map.setView({ bounds: bounds, zoom: 1 })
                    }
                } else {
                    console.error(`Invalid coordinates for city ${cities[index].city}`);
                }
            });
        }).catch(error => {
            console.error("Error fetching coordinates:", error);
        });
    }).catch(error => {
        console.error("Error fetching cities:", error);
    });
}

window.onload = loadMapScenario;