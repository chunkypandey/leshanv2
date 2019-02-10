/*******************************************************************************
 * Copyright (c) 2013-2015 Sierra Wireless and others.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * and Eclipse Distribution License v1.0 which accompany this distribution.
 *
 * The Eclipse Public License is available at
 *    http://www.eclipse.org/legal/epl-v10.html
 * and the Eclipse Distribution License is available at
 *    http://www.eclipse.org/org/documents/edl-v10.html.
 *
 * Contributors:
 *     Sierra Wireless - initial API and implementation
 *     Achim Kraus (Bosch Software Innovations GmbH) - fix typo in notificationCallback
 *                                                     processing multiple resources
 *******************************************************************************/

var lwClientControllers = angular.module('clientControllers', []);


// Update client in a list of clients (replaces the client with the same endpoint))
function updateClient(updated, clients) {
    return clients.reduce(function (accu, client) {
        if (updated.endpoint === client.endpoint) {
            accu.push(updated);
        } else {
            accu.push(client);
        }
        return accu;
    }, []);
}

lwClientControllers.controller('ClientListCtrl', [
    '$scope',
    '$http',
    '$location',
    function ClientListCtrl($scope, $http, $location) {

        // update navbar
        angular.element("#navbar").children().removeClass('active');
        angular.element("#client-navlink").addClass('active');

        // free resource when controller is destroyed
        $scope.$on('$destroy', function () {
            if ($scope.eventsource) {
                $scope.eventsource.close();
            }
        });

        // add function to show client
        $scope.showClient = function (client) {
            $location.path('/clients/' + client.endpoint);
        };

        // the tooltip message to display for a client (all standard attributes, plus additional ones)
        $scope.clientTooltip = function (client) {
            var standard = ["Lifetime: " + client.lifetime + "s",
                "Binding mode: " + client.bindingMode,
                "Protocol version: " + client.lwM2mVersion,
                "Address: " + client.address];

            var tooltip = standard.join("<br/>");
            if (client.additionalRegistrationAttributes) {
                var attributes = client.additionalRegistrationAttributes;
                var additionals = [];
                for (key in attributes) {
                    var value = attributes[key];
                    additionals.push(key + " : " + value);
                }
                if (additionals.length > 0) {
                    tooltip = tooltip + "<hr/>" + additionals.join("<br/>");
                }
            }
            return tooltip;
        };


        /*************************HARD CODED DATAs*********************************/

        // get the list of connected clients
        $http.get('api/clients').error(function (data, status, headers, config) {
            $scope.error = "Unable to get client list: " + status + " " + data;
            console.error($scope.error);
        }).success(function (data, status, headers, config) {
           $scope.clients = data;
           //  $scope.clients = [{
           //      "endpoint": "urn:imei:867290030347990",
           //      "registrationId": "YzPbuif9Fn",
           //      "registrationDate": "2019-01-12T11:55:01+05:30",
           //      "lastUpdate": "2019-01-12T12:13:43+05:30",
           //      "address": "42.111.3.203:57381",
           //      "lwM2mVersion": "1.0",
           //      "lifetime": 27,
           //      "bindingMode": "U",
           //      "rootPath": "/",
           //      "objectLinks": [{"url": "/", "attributes": {"rt": "oma.lwm2m"}}, {
           //          "url": "/1/0",
           //          "attributes": {}
           //      }, {"url": "/2/0", "attributes": {}}, {"url": "/3/0", "attributes": {}}, {
           //          "url": "/4/0",
           //          "attributes": {}
           //      }, {"url": "/5/0", "attributes": {}}, {"url": "/6/0", "attributes": {}}, {
           //          "url": "/7/0",
           //          "attributes": {}
           //      }, {"url": "/9", "attributes": {}}, {"url": "/15", "attributes": {}}, {
           //          "url": "/3303/0",
           //          "attributes": {}
           //      }, {"url": "/3304/0", "attributes": {}}, {"url": "/3315/0", "attributes": {}}, {
           //          "url": "/3330/0",
           //          "attributes": {}
           //      }],
           //      "secure": false,
           //      "additionalRegistrationAttributes": {}
           //  }];
            // HACK : we can not use ng-if="clients"
            // because of https://github.com/angular/angular.js/issues/3969
            $scope.clientslist = true;

            // listen for clients registration/deregistration
            $scope.eventsource = new EventSource('event');

            var registerCallback = function (msg) {
                $scope.$apply(function () {
                    var client = JSON.parse(msg.data);
                    $scope.clients.push(client);
                });
            };

            var updateCallback = function (msg) {
                $scope.$apply(function () {
                    var client = JSON.parse(msg.data);
                    $scope.clients = updateClient(client, $scope.clients);
                });
            };

            var sleepingCallback = function (msg) {
                $scope.$apply(function () {
                    var data = JSON.parse(msg.data);
                    for (var i = 0; i < $scope.clients.length; i++) {
                        if ($scope.clients[i].endpoint === data.ep) {
                            $scope.clients[i].sleeping = true;
                        }
                    }
                });
            };

            var awakeCallback = function (msg) {
                $scope.$apply(function () {
                    var data = JSON.parse(msg.data);
                    for (var i = 0; i < $scope.clients.length; i++) {
                        if ($scope.clients[i].endpoint === data.ep) {
                            $scope.clients[i].sleeping = false;
                        }
                    }
                });
            };

            $scope.eventsource.addEventListener('REGISTRATION', registerCallback, false);

            $scope.eventsource.addEventListener('UPDATED', updateCallback, false);

            $scope.eventsource.addEventListener('SLEEPING', sleepingCallback, false);

            $scope.eventsource.addEventListener('AWAKE', awakeCallback, false);

            var getClientIdx = function (client) {
                for (var i = 0; i < $scope.clients.length; i++) {
                    if ($scope.clients[i].registrationId == client.registrationId) {
                        return i;
                    }
                }
                return -1;
            };
            var deregisterCallback = function (msg) {
                $scope.$apply(function () {
                    var clientIdx = getClientIdx(JSON.parse(msg.data));
                    if (clientIdx >= 0) {
                        $scope.clients.splice(clientIdx, 1);
                    }
                });
            };
            $scope.eventsource.addEventListener('DEREGISTRATION', deregisterCallback, false);
        });

    }]);

lwClientControllers.controller('ClientDetailCtrl', [
    '$scope',
    '$location',
    '$routeParams',
    '$http',
    'lwResources',
    '$filter',
    function ($scope, $location, $routeParams, $http, lwResources, $filter) {
        // update navbar
        angular.element("#navbar").children().removeClass('active');
        angular.element("#client-navlink").addClass('active');

        // free resource when controller is destroyed
        $scope.$on('$destroy', function () {
            if ($scope.eventsource) {
                $scope.eventsource.close();
            }
        });

        /**********Admin + Sensor*************/

        $scope.selectObjectTypePanel = function(removeId,addId){

            $scope.showObjectType = addId;
            angular.element('#'+removeId).removeClass('active');
            angular.element('#'+addId).addClass('active');
        };

        $scope.selectObjectTypePanel('adminPanel','sensorPanel');

        /**********Admin + Sensor*************/

        // default format
        $scope.settings = {};
        $scope.settings.multi = {format: "TLV"};
        $scope.settings.single = {format: "TLV"};

        $scope.clientId = $routeParams.clientId;



        // get client details
        $http.get('api/clients/' + $routeParams.clientId)
            .error(function (data, status, headers, config) {
                $scope.error = "Unable to get client " + $routeParams.clientId + " : " + status + " " + data;
                console.error($scope.error);
            })
            .success(function (data, status, headers, config) {
                $scope.client = data;
                // $scope.client = {
                //     "endpoint": "urn:imei:867290030347990",
                //     "registrationId": "YzPbuif9Fn",
                //     "registrationDate": "2019-01-12T11:55:01+05:30",
                //     "lastUpdate": "2019-01-12T12:16:17+05:30",
                //     "address": "42.111.3.203:57381",
                //     "lwM2mVersion": "1.0",
                //     "lifetime": 27,
                //     "bindingMode": "U",
                //     "rootPath": "/",
                //     "objectLinks": [{"url": "/", "attributes": {"rt": "oma.lwm2m"}}, {
                //         "url": "/1/0",
                //         "attributes": {}
                //     }, {"url": "/2/0", "attributes": {}}, {"url": "/2/3", "attributes": {}}, {
                //         "url": "/2/4",
                //         "attributes": {}
                //     }, {"url": "/2/5", "attributes": {}}, {"url": "/2/6", "attributes": {}}, {
                //         "url": "/2/7",
                //         "attributes": {}
                //     }, {"url": "/2/8", "attributes": {}}, {"url": "/2/9", "attributes": {}}, {
                //         "url": "/2/10",
                //         "attributes": {}
                //     }, {"url": "/2/11", "attributes": {}}, {"url": "/3/0", "attributes": {}}, {
                //         "url": "/4/0",
                //         "attributes": {}
                //     }, {"url": "/5/0", "attributes": {}}, {"url": "/6/0", "attributes": {}}, {
                //         "url": "/7/0",
                //         "attributes": {}
                //     }, {"url": "/9", "attributes": {}}, {"url": "/15", "attributes": {}}, {
                //         "url": "/3303/0",
                //         "attributes": {}
                //     }, {"url": "/3304/0", "attributes": {}}, {"url": "/3315/0", "attributes": {}}, {
                //         "url": "/3330/0",
                //         "attributes": {}
                //     }],
                //     "secure": false,
                //     "additionalRegistrationAttributes": {}
                // };

                // update resource tree with client details
                lwResources.buildResourceTree($scope.client.rootPath, $scope.client.objectLinks, function (objects) {
                    $scope.objects = objects;
                });

                // listen for clients registration/deregistration/observe
                $scope.eventsource = new EventSource('event?ep=' + $routeParams.clientId);

                var registerCallback = function (msg) {
                    $scope.$apply(function () {
                        $scope.deregistered = false;
                        $scope.client = JSON.parse(msg.data);
                        lwResources.buildResourceTree($scope.client.rootPath, $scope.client.objectLinks, function (objects) {
                            $scope.objects = objects;
                        });
                    });
                };
                $scope.eventsource.addEventListener('REGISTRATION', registerCallback, false);

                var deregisterCallback = function (msg) {
                    $scope.$apply(function () {
                        $scope.deregistered = true;
                        $scope.client = null;
                    });
                };
                $scope.eventsource.addEventListener('DEREGISTRATION', deregisterCallback, false);


                /********************Slider *****************************/
                $scope.resetSlider = function (id) {
                    // sliderObj1.noUiSlider.set(0,24,100);

                    if (id) {
                        var slider = document.getElementById(id);
                    }
                    if (slider) {
                        if (slider.noUiSlider) {
                            slider.noUiSlider.destroy();
                        } else {
                            var handleValue = [12, 24, 36];
                            var rangeValue = [0, 100];
                        }

                        createSlider(handleValue, slider, rangeValue);
                    }

                };


                function doSliderStuff(id, value, name) {
                    var index = 0;

                    var rangeValue = [0, 100];
                    var handleValue = [12, 24, 36];
                    var doUpdate = false;
                    var updateRange = false;
                    var updateHandleValue = false;
                    switch (name) {
                        case "Min Range Value":
                            rangeValue[0] = value;
                            doUpdate = true;
                            updateRange = true;
                            break;
                        case "Max Range Value":
                            rangeValue[1] = value;
                            updateRange = true;
                            doUpdate = true;
                            break;
                        case "Min Measured Value":
                            index = 0;
                            updateHandleValue = true;
                            doUpdate = true;
                            break;
                        case "Max Measured Value":
                            index = 2;
                            updateHandleValue = true;
                            doUpdate = true;
                            break;
                        case "Sensor Value":
                            index = 1;
                            updateHandleValue = true;
                            doUpdate = true;
                            break;
                    }

                    if (doUpdate) {
                        if (id) {
                            var slider = document.getElementById(id);
                        }
                        if (slider) {
                            if (slider.noUiSlider) {
                                handleValue = slider.noUiSlider.get();
                                slider.noUiSlider.destroy();
                            } else {
                                handleValue = [12, 24, 36];
                            }
                            if (updateHandleValue) {
                                handleValue[index] = value;
                            }

                            createSlider(handleValue, slider, rangeValue);
                        }
                    }
                }

                function createSlider(handleData, slider, rangeValue) {
                    // rangeValue = [0,100];
                    noUiSlider.create(slider, {
                        start: handleData,
                        behaviour: 'tap',
                        connect: [false,true,true,false],
                        tooltips: true,
                        // format: wNumb({
                        //     decimals: 0
                        // }),
                        // range: {
                        //     'min': rangeValue[0],
                        //     'max': rangeValue[1]
                        // },
                        pips: {
                            mode: 'positions',
                            values: [0, 10, 20, 30, 50, 40, 50, 60, 70 ,80 ,90, 100],
                            density: 4,
                            stepped: true
                        }
                    });

                    var connect = slider.querySelectorAll('.noUi-connect'); /*****Slider Colour*******/
                    var classes = ['c-1-color', 'c-2-color'];

                    for (var i = 0; i < connect.length; i++) {
                        connect[i].classList.add(classes[i]);
                    }

                    // slider.setAttribute('disabled', true);       /*****Slider Freeze*******/

                }


                /******************HARD CODED DATA**********************/

                var notificationCallback = function (msg) {
                    $scope.$apply(function () {
                        var content = JSON.parse(msg.data);
                        var resource = lwResources.findResource($scope.objects, content.res);
                        if (resource) {
                            if ("value" in content.val) {
                                // single value
                                resource.value = content.val.value;
                                var tempResourcePath = resource.path;
                                var splittedTempResourcePath = tempResourcePath.split("/");
                                var tempParentPath  = "/"+splittedTempResourcePath[1]+"/"+splittedTempResourcePath[2];
                                doSliderStuff(tempParentPath, resource.value, resource.def.name);
                            } else if ("values" in content.val) {
                                // multiple instances
                                var tab = new Array();
                                for (var i in content.val.values) {
                                    tab.push(i + "=" + content.val.values[i]);
                                }
                                resource.value = tab.join(", ");
                            }
                            resource.valuesupposed = false;
                            resource.observed = true;

                            var formattedDate = $filter('date')(new Date(), 'HH:mm:ss.sss');
                            resource.tooltip = formattedDate;
                        } else {
                            // instance?
                            var instance = lwResources.findInstance($scope.objects, content.res);
                            if (instance) {
                                instance.observed = true;
                                for (var i in content.val.resources) {
                                    var tlvresource = content.val.resources[i];
                                    resource = lwResources.addResource(instance.parent, instance, tlvresource.id, null);
                                    if ("value" in tlvresource) {
                                        // single value
                                        resource.value = tlvresource.value;
                                    } else if ("values" in tlvresource) {
                                        // multiple instances
                                        var tab = new Array();
                                        for (var j in tlvresource.values) {
                                            tab.push(j + "=" + tlvresource.values[j]);
                                        }
                                        resource.value = tab.join(", ");
                                    }
                                    resource.valuesupposed = false;
                                    resource.tooltip = formattedDate;
                                }
                            }
                        } // TODO object level
                    });
                };
                $scope.eventsource.addEventListener('NOTIFICATION', notificationCallback, false);

                $scope.coaplogs = [];
                var coapLogCallback = function (msg) {
                    $scope.$apply(function () {
                        var log = JSON.parse(msg.data);
                        log.date = $filter('date')(new Date(log.timestamp), 'HH:mm:ss.sss');
                        if (256 < $scope.coaplogs.length) $scope.coaplogs.shift();
                        $scope.coaplogs.push(log);
                    });
                };
                $scope.eventsource.addEventListener('COAPLOG', coapLogCallback, false);

                // coap logs hidden by default
                $scope.coapLogsCollapsed = true;
                $scope.toggleCoapLogs = function () {
                    $scope.coapLogsCollapsed = !$scope.coapLogsCollapsed;
                };
            });



    //    repeating client list controller code for the client dropdown


        // add function to show client
        $scope.showClient = function (client) {
            $location.path('/clients/' + client.endpoint);
        };

        // the tooltip message to display for a client (all standard attributes, plus additional ones)
        $scope.clientTooltip = function (client) {
            var standard = ["Lifetime: " + client.lifetime + "s",
                "Binding mode: " + client.bindingMode,
                "Protocol version: " + client.lwM2mVersion,
                "Address: " + client.address];

            var tooltip = standard.join("<br/>");
            if (client.additionalRegistrationAttributes) {
                var attributes = client.additionalRegistrationAttributes;
                var additionals = [];
                for (key in attributes) {
                    var value = attributes[key];
                    additionals.push(key + " : " + value);
                }
                if (additionals.length > 0) {
                    tooltip = tooltip + "<hr/>" + additionals.join("<br/>");
                }
            }
            return tooltip;
        };



        /*************************HARD CODED DATAs*********************************/

        // get the list of connected clients
        $http.get('api/clients').error(function (data, status, headers, config) {
            $scope.error = "Unable to get client list: " + status + " " + data;
            console.error($scope.error);
        }).success(function (data, status, headers, config) {
            $scope.clients = data;
            // $scope.clients = [{
            //     "endpoint": "urn:imei:867290030347990",
            //     "registrationId": "YzPbuif9Fn",
            //     "registrationDate": "2019-01-12T11:55:01+05:30",
            //     "lastUpdate": "2019-01-12T12:13:43+05:30",
            //     "address": "42.111.3.203:57381",
            //     "lwM2mVersion": "1.0",
            //     "lifetime": 27,
            //     "bindingMode": "U",
            //     "rootPath": "/",
            //     "objectLinks": [{"url": "/", "attributes": {"rt": "oma.lwm2m"}}, {
            //         "url": "/1/0",
            //         "attributes": {}
            //     }, {"url": "/2/0", "attributes": {}}, {"url": "/3/0", "attributes": {}}, {
            //         "url": "/4/0",
            //         "attributes": {}
            //     }, {"url": "/5/0", "attributes": {}}, {"url": "/6/0", "attributes": {}}, {
            //         "url": "/7/0",
            //         "attributes": {}
            //     }, {"url": "/9", "attributes": {}}, {"url": "/15", "attributes": {}}, {
            //         "url": "/3303/0",
            //         "attributes": {}
            //     }, {"url": "/3304/0", "attributes": {}}, {"url": "/3315/0", "attributes": {}}, {
            //         "url": "/3330/0",
            //         "attributes": {}
            //     }],
            //     "secure": false,
            //     "additionalRegistrationAttributes": {}
            // }];
            // HACK : we can not use ng-if="clients"
            // because of https://github.com/angular/angular.js/issues/3969
            $scope.clientslist = true;

            // listen for clients registration/deregistration
            $scope.eventsource = new EventSource('event');

            var registerCallback = function (msg) {
                $scope.$apply(function () {
                    var client = JSON.parse(msg.data);
                    $scope.clients.push(client);
                });
            };

            var updateCallback = function (msg) {
                $scope.$apply(function () {
                    var client = JSON.parse(msg.data);
                    $scope.clients = updateClient(client, $scope.clients);
                });
            };

            var sleepingCallback = function (msg) {
                $scope.$apply(function () {
                    var data = JSON.parse(msg.data);
                    for (var i = 0; i < $scope.clients.length; i++) {
                        if ($scope.clients[i].endpoint === data.ep) {
                            $scope.clients[i].sleeping = true;
                        }
                    }
                });
            };

            var awakeCallback = function (msg) {
                $scope.$apply(function () {
                    var data = JSON.parse(msg.data);
                    for (var i = 0; i < $scope.clients.length; i++) {
                        if ($scope.clients[i].endpoint === data.ep) {
                            $scope.clients[i].sleeping = false;
                        }
                    }
                });
            };

            $scope.eventsource.addEventListener('REGISTRATION', registerCallback, false);

            $scope.eventsource.addEventListener('UPDATED', updateCallback, false);

            $scope.eventsource.addEventListener('SLEEPING', sleepingCallback, false);

            $scope.eventsource.addEventListener('AWAKE', awakeCallback, false);

            var getClientIdx = function (client) {
                for (var i = 0; i < $scope.clients.length; i++) {
                    if ($scope.clients[i].registrationId == client.registrationId) {
                        return i;
                    }
                }
                return -1;
            };
            var deregisterCallback = function (msg) {
                $scope.$apply(function () {
                    var clientIdx = getClientIdx(JSON.parse(msg.data));
                    if (clientIdx >= 0) {
                        $scope.clients.splice(clientIdx, 1);
                    }
                });
            };
            $scope.eventsource.addEventListener('DEREGISTRATION', deregisterCallback, false);
        });
    }]);
