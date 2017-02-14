(function () {

    var zdpevent;
    if (document.createEvent) {
        zdpevent = document.createEvent("Event");
        zdpevent.initEvent("zdpOnSelectedChange", true, true);
    } else {
        zdpevent = document.createEventObject();
        zdpevent.eventType = "zdpOnSelectedChange";
    }

    this.zdropdown = function (eId, inputOptions) {
        return new zdropdownCore(eId, inputOptions);
    }

    this.zdropdownCore = function (eId, inputOptions) {
        var scope = this;
        var goAhead = eId && document.getElementById(eId);
        if (!goAhead) {
            console.error('zdropdown : element \'' + eId + '\' does not exists');
            return;
        }

        scope.eId = eId;
        scope.elem = document.getElementById(eId);
        scope.elem.value = '';

        if (scope.elem.type != "text") {
            console.error('zdropdown : element \'' + eId + '\' is not a text input');
            return;
        }


        var defaultRemoteDataOptions = {
            dataUrl: '',
            //'isOneTimeData' used to indicate whether to take the data while scrolling or not.
            //if 'isOneTimeData' is 'true' , plugin wont raise any request to get the data while scrolling
            isOneTimeData: true,
            //this 'NoOfDataPerRequest' will be used while using remote data provider (dataUrl)            
            NoOfDataPerRequest: 100,
            //'dataRequestHeaderOptions' helps to mentions any special header 
            dataRequestHeaderOptions: {},
            //in order to mention the the 'data from',
            //this text will be added while raising request along with the dataUrl
            queryStringTakeDataFrom: "TakeDataFrom",
            ////in order to mention the the 'data to',
            //this text will be added while raising request along with the dataUrl
            querystringTakeDataTo: "TakeDataTo",
            //in order to mention the the 'data search',
            //this text will be added while raising request along with the dataUrl
            querystringSearch: "Search",
            //'searchColumns' is will be sent through body of the request. 
            //if anything mentioned in 'searchColumns' plugin raise will use POST method 
            searchColumns: []
        };

        var defaultOptions = {
            //remote data request method always will be get
            //in case of search request if anything mentioned in the searchColumns proprty,
            //plugin will use POST method
            remoteDataOptions: defaultRemoteDataOptions,
            //if any data provided 'dataCollection' plugin wont make any request for data including for search
            //plugin will use this provided local data
            dataCollection: [],
            displayPropertName: '',
            valuePropertyName: '',
            width: '225px',
            height: '30px',
            placeholderText: 'Choose',
            onSelectedChange: function (e) {
                return;
            }
        };


        scope.options = defaultOptions;
        if (inputOptions && typeof inputOptions === "object") {
            scope.options = extendDefaults(defaultOptions, inputOptions);
            scope.options.remoteDataOptions = extendDefaults(defaultRemoteDataOptions, scope.options.remoteDataOptions);

        }
        scope.dataCollection = scope.options.dataCollection;
        scope.remoteDataOptions = scope.options.remoteDataOptions;
        scope.takeDataFrom = 0;
        scope.takeDataTo = scope.remoteDataOptions.NoOfDataPerRequest;
        scope.isAllDataLoaded = false;
        scope.isOneTimeData = scope.remoteDataOptions.isOneTimeData;

        scope.takeSearchDataFrom = 0;
        scope.takeSearchDataTo = scope.remoteDataOptions.NoOfDataPerRequest;
        scope.isAllSearchDataLoaded = false;

        //checking whether data provider exists or not
        if (scope.dataCollection.length === 0 && !scope.remoteDataOptions.dataUrl) {
            console.error('zdropdown : plugin need either dataUrl or dataCollection as data provider for the element \'' + eId + '\'');
            return;
        }

        scope.isLocalDataProvider = scope.dataCollection.length > 0;
        scope.isAllDataLoaded = scope.isLocalDataProvider; //if the local data provider enabled then it will be true 
        scope.isAllSearchDataLoaded = scope.isLocalDataProvider; //if the local data provider enabled then it will be true 

        //preparing dom before hiding the original element
        var elemDOMOptions = prepareZDropDownDOM(scope);

        //hiding orginal element
        scope.elem.setAttribute('style', 'display:none !important');

        scope.zdpElem = elemDOMOptions.zdpElem;
        scope.zdpWrapper = elemDOMOptions.zdpWrapper;
        scope.zdpButton = elemDOMOptions.zdpButton;
        scope.zdpListWrapper = elemDOMOptions.zdpListWrapper;
        scope.zdpListUl = elemDOMOptions.zdpListUl;
        scope.zdpSearchListWrapper = elemDOMOptions.zdpSearchListWrapper;
        scope.zdpSearchListUl = elemDOMOptions.zdpSearchListUl;
        scope.elem.parentNode.insertBefore(scope.zdpWrapper, scope.elem);
        scope.zdpWrapper.appendChild(scope.zdpListWrapper);
        scope.zdpWrapper.appendChild(scope.zdpSearchListWrapper);

        scope.getSelectedDataObject = function (displayData, valueData) {
            displayData = displayData || '';
            valueData = valueData || '';
            return { displayData: displayData, valueData: valueData };
        }
        scope.selectedData = scope.getSelectedDataObject();
        scope.enableSearchMode = false;



        scope.elem.addEventListener("zdpOnSelectedChange", scope.options.onSelectedChange);

        scope.zdpListWrapper.addEventListener("scroll", function (e) {
            if (!scope.isLocalDataProvider) {
                var zdpListWrapperScrollHeight = scope.zdpListWrapper.scrollHeight;
                var zdpListWrapperScrollTop = scope.zdpListWrapper.scrollTop;
                var zdpListWrapperClientHeight = scope.zdpListWrapper.clientHeight;
                if ((zdpListWrapperScrollTop > 0) && ((zdpListWrapperScrollHeight - zdpListWrapperScrollTop - zdpListWrapperClientHeight) < 11)) {
                    getRemoteData();
                }
            }
        });

        scope.zdpSearchListWrapper.addEventListener("scroll", function (e) {
            if (!scope.isLocalDataProvider) {
                var zdpSearchListWrapperScrollHeight = scope.zdpSearchListWrapper.scrollHeight;
                var zdpSearchListWrapperScrollTop = scope.zdpSearchListWrapper.scrollTop;
                var zdpSearchListWrapperClientHeight = scope.zdpSearchListWrapper.clientHeight;
                if ((zdpSearchListWrapperScrollTop > 0) && ((zdpSearchListWrapperScrollHeight - zdpSearchListWrapperScrollTop - zdpSearchListWrapperClientHeight) < 11)) {
                    doRemoteSearch(scope.zdpElem.value);
                }
            }
        })


        scope.zdpElem_offset = offset(scope.zdpElem);
        scope.zdpListWrapper_offset = { left: 0, top: 0 };
        scope.zdpSearchListWrapper_offset = { left: 0, top: 0 };

        scope.getSelectedData = function () {
            return scope.selectedData;
        };

        scope.clearSelectedData = function () {
            scope.setSelectedData(scope.getSelectedDataObject());
        }

        scope.setSelectedData = function (data) {
            var zdpFireEvent = false;
            if (typeof data === "object") {
                if (data.hasOwnProperty("displayData")) {
                    if (scope.selectedData.valueData != data.valueData) {
                        zdpFireEvent = true;
                    }
                    scope.selectedData.valueData = scope.elem.value = data.valueData;
                    scope.selectedData.displayData = scope.zdpElem.value = data.displayData;
                }
            }
            else {
                if (scope.selectedData.valueData != data) {
                    zdpFireEvent = true;
                }
                scope.selectedData.displayData = scope.elem.value = data;
                scope.selectedData.valueData = scope.zdpElem.value = data;
            }
            if (zdpFireEvent) {
                if (document.createEvent)
                    scope.elem.dispatchEvent(zdpevent);
                else
                    scope.elem.fireEvent("on" + zdpevent.eventType, zdpevent);
            }

        }

        scope.zdpElem.addEventListener("keyup", zdpEnableLocalDataSearchMode)
        scope.zdpElem.addEventListener("keydown", zdpEnterKeyTackling)
        scope.zdpElem.addEventListener("blur", zdpDisableLocalDataSearchMode);
        scope.zdpButton.addEventListener("click", zdpListLocalData);
        scope.zdpButton.addEventListener("keyup", zdpNavigateListItem);
        scope.zdpButton.addEventListener("keydown", zdpEnterKeyTackling);
        scope.zdpListUl.addEventListener("mousedown", zdpselectedDataClicked, false);
        scope.zdpSearchListUl.addEventListener("mousedown", zdpselectedDataClicked, false);
        window.addEventListener("click", zdpHideListWrapper)

        function zdpDisableLocalDataSearchMode(e) {
            scope.enableSearchMode = false;
            if (scope.selectedData.displayData != scope.zdpElem.value) {
                scope.zdpElem.value = '';
            }
            e.preventDefault();
        }

        function zdpEnterKeyTackling(e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                navigateThroughListorSelectedItem(e.keyCode);
                return;
            }
            return;
        }

        function moveScroll(listLi) {
            var wrapperElem = listLi.parentNode.parentNode;
            var scrollHeight = wrapperElem.scrollHeight;
            var proposedScrollTop = listLi.offsetTop;
            var clientHeight = wrapperElem.clientHeight;
            if (scrollHeight - proposedScrollTop - clientHeight < 11) {
                proposedScrollTop = scrollHeight - clientHeight - 11;
            }
            wrapperElem.scrollTop = proposedScrollTop;

        }

        function doActionOnList(uList, keyCode) {
            var childElements = uList.children;
            if (childElements) {
                var childrenCount = childElements.length;
                var alreadySelectedListItems = uList.getElementsByClassName('highlighted');
                if (!alreadySelectedListItems.length) { //if no listItem Selected                    
                    if (keyCode === 38)//upArrowKey then select last listItem
                    {
                        addClassToElements([childElements[childrenCount - 1]], ['highlighted']);
                        moveScroll(childElements[childrenCount - 1]);
                        return;
                    }
                    else if (keyCode === 40)//downArrowKey then select first listItem
                    {
                        addClassToElements([childElements[0]], ['highlighted'], []);
                        moveScroll(childElements[0]);
                        return;
                    }
                    return;
                }
                else {//if Item selected already
                    if (keyCode === 13) {
                        setSelectedListItemData(alreadySelectedListItems[0]);
                        return;
                    }
                    for (var i = 0; i < childrenCount; i++) {
                        var tmpClassNames = childElements[i].className;
                        if (tmpClassNames.indexOf('highlighted') > -1) {
                            if (keyCode === 38) { //up
                                if (i == 0) {//first elem
                                    addClassToElements([childElements[childrenCount - 1]], ['highlighted']);
                                    moveScroll(childElements[childrenCount - 1]);
                                    removeClassToElements([childElements[0]], ['highlighted']);
                                    return;
                                }
                                else {
                                    addClassToElements([childElements[i - 1]], ['highlighted']);
                                    moveScroll(childElements[i - 1]);
                                    removeClassToElements([childElements[i]], ['highlighted']);
                                    return;
                                }
                            }
                            else if (keyCode === 40) {//down
                                if (i == childrenCount - 1) {//last elem
                                    addClassToElements([childElements[0]], ['highlighted']);
                                    moveScroll(childElements[0]);
                                    removeClassToElements([childElements[childrenCount - 1]], ['highlighted']);
                                    return;
                                }
                                else {
                                    addClassToElements([childElements[i + 1]], ['highlighted']);
                                    moveScroll(childElements[i + 1]);
                                    removeClassToElements([childElements[i]], ['highlighted']);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }


        function navigateThroughListorSelectedItem(keyCode) {
            var zdpListWrapperclassNames = scope.zdpListWrapper.className;
            var zdpSearchListWrapperclassNames = scope.zdpSearchListWrapper.className;
            if (zdpListWrapperclassNames && zdpListWrapperclassNames.indexOf('showzdp') > -1) {
                doActionOnList(scope.zdpListUl, keyCode);
                return true;
            }
            else if (zdpSearchListWrapperclassNames && zdpSearchListWrapperclassNames.indexOf('showzdp') > -1) {
                doActionOnList(scope.zdpSearchListUl, keyCode);
                return true;
            }
            return false;
        }

        function zdpNavigateListItem(e) {
            if (e.keyCode === 13 || e.keyCode === 38 || e.keyCode === 40) //capturing keys enter, up,down
            {
                return navigateThroughListorSelectedItem(e.keyCode);
            }
            return false;
        }

        function zdpEnableLocalDataSearchMode(e) {
            if (e.keyCode === 13 || e.keyCode === 38 || e.keyCode === 40) //capturing keys enter, up,down
            {
                var isNavDone = navigateThroughListorSelectedItem(e.keyCode);
                if (!isNavDone) {
                    if (e.keyCode === 40) {
                        scope.zdpButton.click();
                    }
                }
                return false;
            }
            if (scope.zdpElem.value == '') {
                scope.enableSearchMode = false;
                clrSearchList();
                return false;
            }
            if (scope.selectedData.displayData != '' && scope.selectedData.displayData != scope.zdpElem.value) {
                scope.selectedData = scope.getSelectedDataObject();
            }
            if (scope.selectedData.displayData == '') {
                scope.enableSearchMode = true;
            }
            if (scope.enableSearchMode) {
                showHideList(false);
                zdpDoLocalSearch();
            }
        }

        var searchTimeOut = null;
        function zdpDoLocalSearch(searchTerm) {
            searchTerm = searchTerm || '';
            clearTimeout(searchTimeOut);
            if (searchTerm == '') {
                searchTerm = scope.zdpElem.value;
                searchTimeOut = setTimeout(function () { zdpDoLocalSearch(searchTerm); }, 500);
            }
            else if (searchTerm != scope.zdpElem.value) {
                searchTerm = scope.zdpElem.value;
                searchTimeOut = setTimeout(function () { zdpDoLocalSearch(searchTerm); }, 500);
            }
            else {
                clrSearchList();
                //local search or once data loaded completely
                if (scope.isLocalDataProvider || scope.isAllDataLoaded) {
                    if (scope.dataCollection.length > 0) {
                        var searchedData = [];
                        var isObjecArray = typeof scope.dataCollection[0] === "object";
                        for (var i = 0; i < scope.dataCollection.length; i++) {
                            var tmpDisplayData = isObjecArray ? scope.dataCollection[i][scope.options.displayPropertName] : scope.dataCollection[i];
                            var tmpValueData = isObjecArray ? scope.dataCollection[i][scope.options.valuePropertyName] : scope.dataCollection[i];
                            if (tmpDisplayData.indexOf(searchTerm) > -1) {
                                searchedData.push(scope.dataCollection[i]);
                            }
                        }
                        loadSearchResult(searchedData);
                    }
                }
                else {
                    doRemoteSearch(searchTerm);
                }
            }
        }

        var isGettingSearchData = false;
        function doRemoteSearch(searchTerm) {
            if (!searchTerm) {
                return;
            }
            if (!scope.isLocalDataProvider) {
                if (!scope.isAllSearchDataLoaded) {
                    if (!isGettingSearchData) {
                        var url = scope.remoteDataOptions.dataUrl;
                        var qs = '?' + scope.remoteDataOptions.querystringSearch + '=' + searchTerm;
                        if (!scope.options.isOneTimeData) {
                            qs += '&' + scope.remoteDataOptions.queryStringTakeDataFrom + '=' + scope.takeSearchDataFrom;
                            qs += '&' + scope.remoteDataOptions.querystringTakeDataTo + '=' + scope.takeSearchDataTo;
                        }
                        url += qs;
                        isGettingSearchData = true;
                        getXhr(url,
                            function (xhr) {//success on callback
                                isGettingSearchData = false;
                                var data = JSON.parse(xhr.responseText);
                                if (data.length == 0) // if there is no data then all data loaded from server
                                {
                                    scope.isAllSearchDataLoaded = true;
                                    //return;
                                }
                                else if (scope.isOneTimeData && data.length > 0) { // once  loaded at first time it will set the flag to true
                                    scope.isAllSearchDataLoaded = true;
                                    loadSearchResult(data);
                                }
                                else if (data.length > 0) {
                                    if (data.length < scope.remoteDataOptions.NoOfDataPerRequest) { //indicates there will be nor more data to fetch
                                        scope.isAllSearchDataLoaded = true;
                                    }
                                    scope.takeSearchDataFrom += data.length;
                                    scope.takeSearchDataTo = scope.takeSearchDataFrom + scope.remoteDataOptions.NoOfDataPerRequest;
                                    loadSearchResult(data);
                                }
                            }, function (xhr) {//onFail
                                isGettingSearchData = false;
                                if (xhr.status != 0) {
                                    console.log('zdropdown : while gettting search result Error occured - ' + xhr.status + ' - ' + xhr.statusText + ' - ' + xhr.responseText);
                                }
                                else {
                                    console.log('zdropdown : while gettting search result Error occured - something went wrong');
                                }
                            }, function (e) {//onError
                                isGettingSearchData = false;
                                console.log('zdropdown : while gettting search result Error occured - something went wrong');
                            });

                    }
                }
            }
        }

        function loadSearchResult(searchResult) {
            if (searchResult.length > 0) {
                var isObjecArray = typeof searchResult[0] === 'object';
                for (var i = 0; i < searchResult.length; i++) {
                    var tmpDisplayData = isObjecArray ? searchResult[i][scope.options.displayPropertName] : searchResult[i];
                    var tmpValueData = isObjecArray ? searchResult[i][scope.options.valuePropertyName] : searchResult[i];

                    scope.zdpSearchListUl.innerHTML += '<li zdpvalue="' + tmpValueData + '">' + tmpDisplayData + '</li>';
                }
            }
            if (searchResult.length == 0) {
                clrSearchList();
            }
            else {
                showHideSearchList(true);
            }
        }

        function zdpHideListWrapper(e) {

            e = e || window.event;

            if (e.target == scope.zdpButton) {
                return;
            }
            if (e.target != scope.zdpElem) {
                showHideList(false);
            }
            if (e.target != scope.zdpElem) {
                clrSearchList();
            }
        }

        function zdpselectedDataClicked(e) {
            e = e || window.event;
            if (e.target !== e.currentTarget) {
                var clickedItem = e.target;
                setSelectedListItemData(clickedItem);
            }
            if (e.stopPropagation) {
                // W3C standard variant
                e.stopPropagation()
            } else {
                // IE variant
                e.cancelBubble = true
            }
        }

        function setSelectedListItemData(dataLi) {
            scope.setSelectedData(scope.getSelectedDataObject(dataLi.innerHTML, dataLi.getAttribute("zdpvalue")));
            showHideList(false);
            clrSearchList();
        }

        var IsGettingData = false;
        function getRemoteData() {
            if (!scope.isLocalDataProvider) {
                if (!scope.isAllDataLoaded) {
                    if (!IsGettingData) {
                        var url = scope.remoteDataOptions.dataUrl;
                        var qs = '';
                        if (!scope.options.isOneTimeData) {
                            qs += '?' + scope.remoteDataOptions.queryStringTakeDataFrom + '=' + scope.takeDataFrom;
                            qs += '&' + scope.remoteDataOptions.querystringTakeDataTo + '=' + scope.takeDataTo;
                        }
                        url += qs;
                        IsGettingData = true;
                        getXhr(url,
                            function (xhr) {//success on callback
                                IsGettingData = false;
                                var data = JSON.parse(xhr.responseText);
                                if (data.length == 0) // if there is no data then all data loaded from server
                                {
                                    scope.isAllDataLoaded = true;
                                    //return;
                                }
                                else if (scope.isOneTimeData && data.length > 0) { // once  loaded at first time it will set the flag to true
                                    scope.isAllDataLoaded = true;
                                    loadData(data);
                                }
                                else if (data.length > 0) {
                                    if (data.length < scope.remoteDataOptions.NoOfDataPerRequest) { //indicates there will be nor more data to fetch
                                        scope.isAllDataLoaded = true;
                                    }
                                    scope.takeDataFrom += data.length;
                                    scope.takeDataTo = scope.takeDataFrom + scope.remoteDataOptions.NoOfDataPerRequest;
                                    loadData(data);
                                }
                                for (var i = 0; i < data.length; i++) {
                                    scope.dataCollection.push(data[i]);
                                }
                            }, function (xhr) {//onFail
                                IsGettingData = false;
                                if (xhr.status != 0) {
                                    console.log('zdropdown : while gettting data Error occured - ' + xhr.status + ' - ' + xhr.statusText + ' - ' + xhr.responseText);
                                }
                                else {
                                    console.log('zdropdown : while gettting data Error occured - something went wrong');
                                }
                            }, function (e) {//onError
                                IsGettingData = false;
                                console.log('zdropdown : while gettting data Error occured - something went wrong');
                            });
                    }
                }
            }
        }

        function loadData(data) {
            if (data.length > 0) {
                if (typeof data[0] === "object") {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].hasOwnProperty(scope.options.displayPropertName)
                            && data[i].hasOwnProperty(scope.options.valuePropertyName)) {
                            scope.zdpListUl.innerHTML += '<li  zdpvalue="'
                                + data[i][scope.options.valuePropertyName] + '">'
                                + data[i][scope.options.displayPropertName] + '</li>';
                        }
                        else {
                            //scope.zdpListUl.innerHTML = '';
                            console.error('zdropdown : one of data options provided to the elements \'' + eId
                                + '\' does not have either  \'displayPropertName\' & \'valuePropertyName\' property');
                            break; //to stop the loop
                        }
                    }
                }
                else {
                    for (var i = 0; i < data.length; i++) {
                        scope.zdpListUl.innerHTML += '<li zdpvalue="' + data[i] + '">'
                            + data[i] + '</li>';
                    }
                }
            }
        }

        function zdpListLocalDataAtFirst() {
            setzdpListWrapperPosition();
            if (!scope.zdpListUl.hasChildNodes()) {
                if (!scope.isLocalDataProvider) //if the remote data option is enabled
                {
                    getRemoteData();
                }
                else {
                    loadData(scope.dataCollection);
                }
            }
        }

        function zdpShowLocalDataList() {
            if (!scope.enableSearchMode) {
                zdpListLocalDataAtFirst();
                showHideList();
            }
        }

        function zdpListLocalData(e) {
            zdpListLocalDataAtFirst();
            //toggle the list
            toggleList();
            e.preventDefault();
            return false;
        }

        function toggleList() {
            var tmpClassNames = scope.zdpListWrapper.className;
            if (tmpClassNames.indexOf("showzdp") > -1) {
                addRemoveClassToElements([scope.zdpListWrapper], ["hidezdp"], ["showzdp"])
                removeHightedListLi();
            }
            else {
                addRemoveClassToElements([scope.zdpListWrapper], ["showzdp"], ["hidezdp"])
                clrSearchList();
                //showHideSearchList(false);
            }
        }

        function showHideList(IsShow) {
            IsShow = IsShow == false ? false : true;
            var tmpClassNames = scope.zdpListWrapper.className;
            if (IsShow) {
                addRemoveClassToElements([scope.zdpListWrapper], ["showzdp"], ["hidezdp"])
                clrSearchList();
                // showHideSearchList(false);
            }
            else {
                addRemoveClassToElements([scope.zdpListWrapper], ["hidezdp"], ["showzdp"])
                removeHightedListLi();
            }
        }

        function removeHightedListLi() {
            var highlightedLi = scope.zdpListUl.getElementsByClassName('highlighted');
            if (highlightedLi.length > 0) {
                removeClassToElements(highlightedLi, ['highlighted']);
            }
        }

        function removeHightedSearchListLi() {
            var highlightedLi = scope.zdpSearchListUl.getElementsByClassName('highlighted');
            if (highlightedLi.length > 0) {
                removeClassToElements(highlightedLi, ['highlighted']);
            }
        }

        function clrSearchList() {
            scope.zdpSearchListWrapper.scrollTop = 0;
            scope.zdpSearchListUl.innerHTML = '';
            scope.takeSearchDataFrom = 0;
            scope.takeSearchDataTo = scope.remoteDataOptions.NoOfDataPerRequest;
            scope.isAllSearchDataLoaded = false;
            showHideSearchList(false);
        }

        function toggleSearchList() {
            var tmpClassNames = scope.zdpSearchListWrapper.className;
            if (tmpClassNames.indexOf("showzdp") > -1) {
                addRemoveClassToElements([scope.zdpSearchListWrapper], ["hidezdp"], ["showzdp"])
            }
            else {
                addRemoveClassToElements([scope.zdpSearchListWrapper], ["showzdp"], ["hidezdp"])
            }
        }

        function showHideSearchList(IsShow) {
            IsShow = IsShow == false ? false : true;

            var tmpClassNames = scope.zdpSearchListWrapper.className;
            if (IsShow) {
                addRemoveClassToElements([scope.zdpSearchListWrapper], ["showzdp"], ["hidezdp"])
                showHideList(false);
                setzdpSearchListWrapperPosition();
            }
            else {
                addRemoveClassToElements([scope.zdpSearchListWrapper], ["hidezdp"], ["showzdp"])
            }
        }

        function setzdpListWrapperPosition(e) {
            scope.zdpElem_offset = offset(scope.zdpElem);
            scope.zdpListWrapper_offset = { left: scope.zdpElem_offset.left, top: scope.zdpElem_offset.top + scope.zdpElem.offsetHeight };
            scope.zdpListWrapper.style.left = scope.zdpListWrapper_offset.left + 'px';
            scope.zdpListWrapper.style.top = scope.zdpListWrapper_offset.top + 'px';
            scope.zdpListWrapper.style.width = scope.zdpElem.offsetWidth + 'px';
        }


        function setzdpSearchListWrapperPosition() {
            scope.zdpElem_offset = offset(scope.zdpElem);
            scope.zdpSearchListWrapper_offset = { left: scope.zdpElem_offset.left, top: scope.zdpElem_offset.top + scope.zdpElem.offsetHeight };
            scope.zdpSearchListWrapper.style.left = scope.zdpSearchListWrapper_offset.left + 'px';
            scope.zdpSearchListWrapper.style.top = scope.zdpSearchListWrapper_offset.top + 'px';
            scope.zdpSearchListWrapper.style.width = scope.zdpElem.offsetWidth + 'px';
        }

        setBasicClasses();
        return scope;
    }




    function prepareZDropDownDOM(scope) {
        var elemOrgin = scope.elem;
        var eId = elemOrgin.id;
        var zdpElem = elemOrgin.cloneNode(true); //copy of the element 
        zdpElem.id = eId + 'zdpInput';
        zdpElem.autocomplete = 'off';
        zdpElem.placeholder = scope.options.placeholderText;
        var zdpWrapper = document.createElement('div');
        zdpWrapper.id = eId + 'zdpWrapper';
        var zdpButton = document.createElement('button');
        zdpButton.id = eId + 'zdpButton';
        zdpButton.innerHTML = '&#9660;';
        zdpWrapper.appendChild(zdpElem);
        zdpWrapper.appendChild(zdpButton);
        //list Wrapper
        var zdpListWrapper = document.createElement('div');
        zdpListWrapper.id = eId + 'zdpListWrapper';
        zdpListWrapper.setAttribute("class", "hidezdp");
        var zdpListUl = document.createElement('ul');
        zdpListUl.id = eId + 'zdpListUl';
        zdpListWrapper.appendChild(zdpListUl);
        //search List Wrapper
        var zdpSearchListWrapper = document.createElement('div');
        zdpSearchListWrapper.id = eId + 'zdpSearchListWrapper';
        zdpSearchListWrapper.setAttribute("class", "hidezdp");
        var zdpSearchListUl = document.createElement('ul');
        zdpSearchListUl.id = eId + 'zdpSearchListUl';
        zdpSearchListWrapper.appendChild(zdpSearchListUl);

        return {
            "zdpElem": zdpElem, "zdpWrapper": zdpWrapper,
            "zdpButton": zdpButton, "zdpListWrapper": zdpListWrapper, "zdpListUl": zdpListUl,
            "zdpSearchListWrapper": zdpSearchListWrapper, "zdpSearchListUl": zdpSearchListUl
        };
    }

    function offset(el) {
        var rect = el.getBoundingClientRect(),
            scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
            scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
    }

    function extendDefaults(source, properties) {
        var property;
        for (property in properties) {
            if (properties.hasOwnProperty(property)) {
                source[property] = properties[property];
            }
        }
        return source;
    }

    function setBasicClasses() {

        var styleTag = document.getElementsByTagName('style');
        if (styleTag.length === 0) {
            styleTag = document.createElement('style');
            document.getElementsByTagName("head")[0].appendChild(styleTag);
        }
        if (!isStyleClassExist('.hidezdp')) {
            var basicClasses = '.hidezdp{display:none;}'
                + '.showzdp{display:block;}'
                + 'div[id$="zdpListWrapper"], div[id$="zdpSearchListWrapper"]{background-color:white;max-height:150px;overflow:auto; border : 1px solid grey;position :absolute !important;}'
                + 'ul[id$="zdpListUl"], ul[id$="zdpSearchListUl"]{list-style-type: none;margin:0px;padding:1px}'
                + 'ul[id$="zdpListUl"]>li, ul[id$="zdpSearchListUl"]>li{cursor:pointer}'
                + 'ul[id$="zdpListUl"]>li:hover, ul[id$="zdpSearchListUl"]>li:hover, .highlighted{background-color:grey;color:white}';
            var styleClasses = document.createTextNode(basicClasses);
            styleTag.appendChild(styleClasses);
        }
    }

    function isStyleClassExist(className) {
        if (document.styleSheets.length > 0) {
            var classes = document.styleSheets[0].rules || document.styleSheets[0].cssRules;
            for (var x = 0; x < classes.length; x++) {
                if (classes[x].selectorText == className) {
                    // (classes[x].cssText) ? alert(classes[x].cssText) : alert(classes[x].style.cssText);
                    return true
                }
            }
        }
        return false;
    }

    function addClassToElements(elemsArray, classesToAddArray) {
        addRemoveClassToElements(elemsArray, classesToAddArray, []);
    }

    function removeClassToElements(elemsArray, classesToRemoveArray) {
        addRemoveClassToElements(elemsArray, [], classesToRemoveArray);
    }

    function addRemoveClassToElements(elemsArray, classesToAddArray, classesToRemoveArray) {
        elemsArray = elemsArray || [];
        classesToAddArray = classesToAddArray || [];
        classesToRemoveArray = classesToRemoveArray || [];
        for (var i = 0; i < elemsArray.length; i++) {
            for (j = 0; j < classesToAddArray.length; j++) {
                if (!elemHasClass(elemsArray[i], classesToAddArray[j]))
                    elemsArray[i].className += " " + classesToAddArray[j];
            }
            for (k = 0; k < classesToRemoveArray.length; k++) {
                var tmpClassNames = elemsArray[i].className;
                tmpClassNames = tmpClassNames.replace(classesToRemoveArray[k], "");
                elemsArray[i].className = tmpClassNames.trim();
            }
        }
    }

    function elemHasClass(elem, className) {
        var exitstingClassNames = elem.className.split(" ");
        for (var i = 0; i < exitstingClassNames.length; i++) {
            if (exitstingClassNames[i] == className) {
                return true;
            }
        }
        return false;
    }

    var defaultXhrOptions = {
        url: "",
        method: "GET",
        data: [],
        callback: function (xhr) {
            return xhr;
        },
        onFail: function (xhr) {
            if (xhr.status != 0)
                console.error("zdropdown : " + xhr.status + " - " + xhr.statusText + " - " + xhr.responseText);
        },
        onError: function (e) {
            console.error("zdropdown : " + e);
        }
    };

    function xhr(_xhrOptions) {
        var xhr;
        var xhrOption = extendDefaults(defaultXhrOptions, _xhrOptions);

        if (typeof XMLHttpRequest !== 'undefined')
            xhr = new XMLHttpRequest();
        else {
            var versions = ["MSXML2.XmlHttp.5.0",
                "MSXML2.XmlHttp.4.0",
                "MSXML2.XmlHttp.3.0",
                "MSXML2.XmlHttp.2.0",
                "Microsoft.XmlHttp"]

            for (var i = 0, len = versions.length; i < len; i++) {
                try {
                    xhr = new ActiveXObject(versions[i]);
                    break;
                }
                catch (e) {
                }
            } // end for
        }

        xhr.onreadystatechange = ensureReadiness;

        function ensureReadiness() {
            if (xhr.readyState === 4) {   //if complete
                if (xhr.status === 200) {  //check if "OK" (200)
                    xhrOption.callback(xhr);
                } else {
                    xhrOption.onFail(xhr);
                }
            }
        }

        xhr.open(xhrOption.method, xhrOption.url, true);
        var data = xhrOption.data.length > 0 ? xhrOption.data : null;
        try {
            xhr.send(data);
        } catch (error) {
            xhrOption.onError(error);
        }
    }

    function getXhr(url, callback, onFail, onError) {
        if (url && callback) {
            var xhrOptions = {
                url: url,
                callback: callback
            }
            if (onFail) {
                xhrOptions.onFail = onFail;
            }
            if (onError) {
                xhrOptions.onError = onError;

            }
            xhr(xhrOptions);
        }
    }

    function postXhr(url, data, callback) {
        if (url && callback) {
            var xhrOptions = {
                method: "POST",
                url: url,
                data: data,
                callback: callback
            }
            if (onFail) {
                xhrOptions.onFail = onFail;
            }
            if (onError) {
                xhrOptions.onError = onError;

            }

            xhr(xhrOptions);
        }
    }


})();