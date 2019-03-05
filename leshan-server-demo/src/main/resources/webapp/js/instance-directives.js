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
 *******************************************************************************/

angular.module('instanceDirectives', [])

    .directive('instance', function ($compile, $routeParams, $http, dialog, $filter, lwResources, $modal, helper, $rootScope) {
        return {
            restrict: "E",
            replace: true,
            scope: {
                instance: '=',
                parent: '=',
                settings: '='
            },
            templateUrl: "partials/instance.html",
            link: function (scope, element, attrs) {
                var parentPath = "";
                scope.pmin = '';
                scope.pmax = '';
                scope.lt = '';
                scope.gt = '';
                scope.st = '';

                var defaultWriteValues = {
                    pmin: '',
                    pmax: '',
                    lt: '',
                    gt: '',
                    st: ''
                };

                scope.instance.path = scope.parent.path + "/" + scope.instance.id;

                scope.instance.read = {tooltip: "Read <br/>" + scope.instance.path};
                scope.instance.write = {tooltip: "Write <br/>" + scope.instance.path};
                scope.instance.del = {tooltip: "Delete <br/>" + scope.instance.path};
                scope.instance.observe = {tooltip: "Observe <br/>" + scope.instance.path};

                scope.read = function () {
                    var format = scope.settings.multi.format;
                    console.log(new Date());
                    var uri = "api/clients/" + $routeParams.clientId + scope.instance.path;
                    $http.get(uri, {params: {format: format}})
                        .success(function (data, status, headers, config) {
                            helper.handleResponse(data, scope.instance.read, function (formattedDate) {
                                if (data.success && data.content) {
                                    for (var i in data.content.resources) {
                                        var tlvresource = data.content.resources[i];
                                        resource = lwResources.addResource(scope.parent, scope.instance, tlvresource.id, null);
                                        if ("value" in tlvresource) {
                                            // single value
                                            resource.value = tlvresource.value;
                                            doSliderStuff(scope.instance.path, resource.value, resource.def.name);
                                            if (resource.def.id == 5603) {
                                                var tempName = resource.path;
                                                $rootScope[tempName] = resource.value;
                                            }
                                            if (resource.def.id == 5604) {
                                                var tempName = resource.path;
                                                $rootScope[tempName] = resource.value;
                                            }
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
                            });
                        }).error(function (data, status, headers, config) {
                        errormessage = "Unable to read instance " + scope.instance.path + " for " + $routeParams.clientId + " : " + status + " " + data;
                        dialog.open(errormessage);
                        console.error(errormessage);
                    });
                };


                scope.del = function () {
                    var uri = "api/clients/" + $routeParams.clientId + scope.instance.path;
                    $http.delete(uri)
                        .success(function (data, status, headers, config) {
                            helper.handleResponse(data, scope.instance.del, function (formattedDate) {
                                // manage delete instance in resource tree.
                                if (data.success) {
                                    var i = scope.parent.instances.indexOf(scope.instance);
                                    if (i != -1) {
                                        scope.parent.instances.splice(i, 1);
                                    }
                                }
                            });
                        }).error(function (data, status, headers, config) {
                        errormessage = "Unable to delete instance " + scope.instance.path + " for " + $routeParams.clientId + " : " + status + " " + data;
                        dialog.open(errormessage);
                        console.error(errormessage);
                    });
                };


                /*******************************Write Attribute STARTS HERE**********************/

                scope.openWriteAttributeModal = function (resourcePath) {
                    scope.resourcePath = resourcePath;
                    scope.modalInstance = $modal.open({
                        templateUrl: 'partials/write-attribute-modal.html',
                        scope: scope
                    });
                };

                scope.closeWriteAttributeModal = function () {
                    scope.modalInstance.close();
                };

                scope.writeAttribute = function (pmin, pmax, lt, gt, st) {

                    scope.pmin = pmin;
                    scope.pmax = pmax;
                    scope.lt = lt;
                    scope.gt = gt;
                    scope.st = st;
                    var flag = false;
                    var errorFlag = false;

                    if (pmin && pmax && lt && gt && st) {

                        if (pmin > pmax) {
                            alert("P-Min can't be greater than P-Max !!");
                            errorFlag = true;
                        } else {
                            if ((lt + (2 * st)) >= gt) {
                                alert("Lt Gt out of Contract !!");
                                errorFlag = true;
                            } else {
                                flag = true;
                            }
                        }
                    } else {
                        alert("All Fiels Required !!");
                        errorFlag = true;
                    }
                    if(errorFlag){
                        scope.pmin = defaultWriteValues.pmin;
                        scope.pmax = defaultWriteValues.pmax;
                        scope.lt =   defaultWriteValues.lt;
                        scope.gt =   defaultWriteValues.gt;
                        scope.st =   defaultWriteValues.st;
                    }

                    if (flag) {
                        // var path=  "";

                        var path = scope.instance.path + '/' + 5700;

                        var uri = "api/clients/" + $routeParams.clientId + path + '/attributes?pmin=' + pmin + '&pmax=' + pmax + '&lt=' + lt + '&gt=' + gt + '&st=' + st;
                        $http.put(uri)
                            .success(function (data, status, headers, config) {

                                // alert("sucess");
                                defaultWriteValues.pmin = pmin;
                                defaultWriteValues.pmax = pmax;
                                defaultWriteValues.lt = lt;
                                defaultWriteValues.gt = gt;
                                defaultWriteValues.st = st;
                                scope.closeWriteAttributeModal();
                            }).error(function (data, status, headers, config) {
                            errormessage = "Unable to read instance " + scope.instance.path + " for " + $routeParams.clientId + " : " + status + " " + data;
                            dialog.open(errormessage);
                            console.log(errormessage);
                        });
                    }

                };


                /*******************************Write Attribute ENDS HERE**********************/


                scope.write = function () {
                    var modalInstance = $modal.open({
                        templateUrl: 'partials/modal-instance.html',
                        controller: 'modalInstanceController',
                        resolve: {
                            object: function () {
                                return scope.parent;
                            },
                            instanceId: function () {
                                return scope.instance.id;
                            }
                        }
                    });

                    modalInstance.result.then(function (instance) {
                        // Build payload
                        var payload = {};
                        payload["id"] = scope.instance.id;
                        payload["resources"] = [];

                        for (i in instance.resources) {
                            var resource = instance.resources[i];
                            if (resource.value != undefined) {
                                payload.resources.push({
                                    id: resource.id,
                                    value: lwResources.getTypedValue(resource.value, resource.def.type)
                                });
                            }
                        }
                        // Send request
                        var format = scope.settings.multi.format;
                        $http({
                            method: 'PUT',
                            url: "api/clients/" + $routeParams.clientId + scope.instance.path,
                            data: payload,
                            headers: {'Content-Type': 'application/json'},
                            params: {format: format}
                        })
                            .success(function (data, status, headers, config) {
                                helper.handleResponse(data, scope.instance.write, function (formattedDate) {
                                    if (data.success) {
                                        for (var i in payload.resources) {
                                            var tlvresource = payload.resources[i];
                                            resource = lwResources.addResource(scope.parent, scope.instance, tlvresource.id, null);
                                            resource.value = tlvresource.value;
                                            resource.valuesupposed = true;
                                            resource.tooltip = formattedDate;
                                        }
                                    }
                                });
                            }).error(function (data, status, headers, config) {
                            errormessage = "Unable to write resource " + scope.instance.path + " for " + $routeParams.clientId + " : " + status + " " + data;
                            dialog.open(errormessage);
                            console.error(errormessage);
                        });

                    });
                };

                scope.startObserve = function () {
                    var format = scope.settings.multi.format;
                    var uri = "api/clients/" + $routeParams.clientId + scope.instance.path + "/observe";
                    $http.post(uri, null, {params: {format: format}})
                        .success(function (data, status, headers, config) {
                            helper.handleResponse(data, scope.instance.observe, function (formattedDate) {
                                if (data.success) {
                                    scope.instance.observed = true;

                                    for (var i in data.content.resources) {
                                        var tlvresource = data.content.resources[i];
                                        resource = lwResources.addResource(scope.parent, scope.instance, tlvresource.id, null);
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


                                    scope.instance.valuesupposed = false;
                                    scope.instance.tooltip = formattedDate;
                                }
                            });
                        }).error(function (data, status, headers, config) {
                        errormessage = "Unable to start observation on instance " + scope.instance.path + " for " + $routeParams.clientId + " : " + status + " " + data;
                        dialog.open(errormessage);
                        console.error(errormessage);
                    });

                };

                scope.stopObserve = function () {
                    var uri = "api/clients/" + $routeParams.clientId + scope.instance.path + "/observe";
                    $http.delete(uri)
                        .success(function (data, status, headers, config) {
                            scope.instance.observed = false;
                            scope.instance.observe.stop = "success";
                        }).error(function (data, status, headers, config) {
                        errormessage = "Unable to stop observation on instance " + scope.instance.path + " for " + $routeParams.clientId + " : " + status + " " + data;
                        dialog.open(errormessage);
                        console.error(errormessage);
                    });
                };

                /********************Slider start*****************************/

                scope.resetSlider = function (id) {
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
                        connect: [false, true, true, false],
                        tooltips: true,
                        // format: wNumb({
                        //     decimals: 0
                        // }),
                        range: {
                            'min': rangeValue[0],
                            'max': rangeValue[1]
                        },
                        pips: {
                            mode: 'positions',
                            values: [0, 10, 20, 30, 50, 40, 50, 60, 70, 80, 90, 100],
                            density: 4,
                            stepped: true
                        }
                    });

                    var connect = slider.querySelectorAll('.noUi-connect');
                    /*****Slider Colour*******/
                    var classes = ['c-1-color', 'c-2-color'];

                    for (var i = 0; i < connect.length; i++) {
                        connect[i].classList.add(classes[i]);
                    }

                    // slider.setAttribute('disabled', true);       /*****Slider Freeze*******/

                }

                /********************Slider ends here*****************************/

                /********************Onload  starts here*****************************/
                var timeIntervals = {

                    "/3303/0":3000,
                    "/3304/0":6000,
                    "/3311/0":9000,
                    // "/3315/0":20000,
                    "/3330/0":12000

                    // "/3303/1":1000,
                    // "/3304/1":2000,
                    // "/3311/1":3000,
                    // "/3315/1":4000,
                    // "/3330/1":5000,
                    //
                    // "/3303/2":1000,
                    // "/3304/2":2000,
                    // "/3311/2":3000,
                    // "/3315/2":4000,
                    // "/3330/2":5000

                };

                function callAtInterval() {
                    // if(scope.resource.def.id==5603 || scope.resource.def.id==5604 || scope.resource.def.id==5701){

                    scope.read();
                    // }
                }
                if(timeIntervals[scope.instance.path]){
                    setTimeout(function(){callAtInterval();}, timeIntervals[scope.instance.path]);
                }
                /********************Onload ends here*****************************/
            }
        };
    });