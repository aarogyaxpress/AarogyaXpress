function varargout = TRAIN(varargin)
%clear;
%clc;
% TRAIN M-file for TRAIN.fig
%      TRAIN, by itself, creates a new TRAIN or raises the existing
%      singleton*.
%
%      H = TRAIN returns the handle to a new TRAIN or the handle to
%      the existing singleton*.
%
%      TRAIN('CALLBACK',hObject,eventData,handles,...) calls the local
%      function named CALLBACK in TRAIN.M with the given input arguments.
%
%      TRAIN('Property','Value',...) creates a new TRAIN or raises the
%      existing singleton*.  Starting from the left, property value pairs are
%      applied to the GUI before TRAIN_OpeningFcn gets called.  An
%      unrecognized property name or invalid value makes property application
%      stop.  All inputs are passed to TRAIN_OpeningFcn via varargin.
%
%      *See GUI Options on GUIDE's Tools menu.  Choose "GUI allows only one
%      instance to run (singleton)".
%
% See also: GUIDE, GUIDATA, GUIHANDLES

% Edit the above text to modify the response to help TRAIN

% Last Modified by GUIDE v2.5 12-Sep-2013 16:28:42

% Begin initialization code - DO NOT EDIT
gui_Singleton = 1;
gui_State = struct('gui_Name',       mfilename, ...
                   'gui_Singleton',  gui_Singleton, ...
                   'gui_OpeningFcn', @TRAIN_OpeningFcn, ...
                   'gui_OutputFcn',  @TRAIN_OutputFcn, ...
                   'gui_LayoutFcn',  [] , ...
                   'gui_Callback',   []);
if nargin && ischar(varargin{1})
    gui_State.gui_Callback = str2func(varargin{1});
end

if nargout
    [varargout{1:nargout}] = gui_mainfcn(gui_State, varargin{:});
else
    gui_mainfcn(gui_State, varargin{:});
end
% End initialization code - DO NOT EDIT


% --- Executes just before TRAIN is made visible.
function TRAIN_OpeningFcn(hObject, eventdata, handles, varargin)
% This function has no output args, see OutputFcn.
% hObject    handle to figure
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)
% varargin   command line arguments to TRAIN (see VARARGIN)

% Choose default command line output for TRAIN
handles.output = hObject;

% Update handles structure
guidata(hObject, handles);

% UIWAIT makes TRAIN wait for user response (see UIRESUME)
% uiwait(handles.figure1);


% --- Outputs from this function are returned to the command line.
function varargout = TRAIN_OutputFcn(hObject, eventdata, handles) 
% varargout  cell array for returning output args (see VARARGOUT);
% hObject    handle to figure
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Get default command line output from handles structure
varargout{1} = handles.output;
set(handles.gist, 'Value', 1);


% --- Executes on button press in br_tb_push.
function br_tb_push_Callback(hObject, eventdata, handles)
% hObject    handle to br_tb_push (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)
indirtb=uigetdir;
set(handles.editbrtb,'string',indirtb);


% --- Executes on button press in br_no_push.
function br_no_push_Callback(hObject, eventdata, handles)
% hObject    handle to br_no_push (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)
indirno=uigetdir;
set(handles.editbrno,'string',indirno);


function editbrno_Callback(hObject, eventdata, handles)
% hObject    handle to editbrno (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of editbrno as text
%        str2double(get(hObject,'String')) returns contents of editbrno as a double


% --- Executes during object creation, after setting all properties.
function editbrno_CreateFcn(hObject, eventdata, handles)
% hObject    handle to editbrno (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function editbrtb_Callback(hObject, eventdata, handles)
% hObject    handle to editbrtb (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of editbrtb as text
%        str2double(get(hObject,'String')) returns contents of editbrtb as a double


% --- Executes during object creation, after setting all properties.
function editbrtb_CreateFcn(hObject, eventdata, handles)
% hObject    handle to editbrtb (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


% --- Executes on button press in train_push.
function train_push_Callback(hObject, eventdata, handles)
% hObject    handle to train_push (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)
clear param
param.imageSize = [1024 1024]; % it works also with non-square images
param.fc_prefilt = 4;


% Computing gist requires 1) prefilter image, 2) filter image and collect
%output energies
checkboxgist = get(handles.gist,'Value');
checkboxphog = get(handles.phog,'Value');
Gist=[];
label=[];
bin = 8;
angle = 360;
L=3;
roi = [100;900;100;900];
indtb=get(handles.editbrtb,'string');
s = dir(fullfile(indtb, '*.*'));
progressbar('TB data training')%,'Normal data training')
for i = 3:length(s)
    pause(0.01) % Do something important
    progressbar(i/length(s))
    complete = strcat(indtb,'/',s(i).name);
        if length(regexpi(s(3).name, 'jpg'))>0
		img1=imread(complete);
	else
		img1=dicomread(complete);
	end
        img1=imresize(img1,[1024 1024]);
        if max(img1(:)>255)
    		param.numberBlocks = 8;
    		param.orientationsPerScale = [8 8 8 8];
	else
		param.orientationsPerScale = [12 12 12 12];
		param.numberBlocks = 4;    
	end
    	if checkboxphog==1
    		myvec = anna_phog(img1,bin,angle,L,roi);
    		myvec=myvec';
    	end
    	if checkboxgist==1
    		[myvec] = createGist(img1, '', param);
    	end

	gist1=[myvec 1];
	Gist=[Gist;gist1];
end
indno=get(handles.editbrno,'string');
s = dir(fullfile(indno, '*'));
progressbar('Normal data training')
for i = 3:length(s)
    pause(0.01) % Do something important
    progressbar(i/length(s))
    complete = strcat(indno,'/',s(i).name);
	if length(regexpi(s(3).name, 'jpg'))>0
		img1=imread(complete);
	else
		img1=dicomread(complete);
	end
        img1=imresize(img1,[1024 1024]);
    if checkboxphog==1
    	myvec = anna_phog(img1,bin,angle,L,roi);
    	myvec=myvec';
    end
    if checkboxgist==1
    	[myvec] = createGist(img1, '', param);
    end
    gist1=[myvec 2];
    Gist=[Gist;gist1];
end
Gist=double(Gist);
trGab=Gist;
[rows cols]=size(Gist);
Gist=Gist(randperm(rows),:);
label=Gist(:,cols);
labeltr=label;
save labeltr.mat labeltr;
Gist=Gist(:,1:cols-1);
oldFolder = cd('./fspackage/');
load_classes
[out] =  fsChiSquare(Gist,label)
list=out.fList;
cd(oldFolder);
data=Gist(:,list);
minimums = min(data, [], 1);
ranges = max(data, [], 1) - minimums;
data = (data - repmat(minimums, size(data, 1), 1)) ./ repmat(ranges, size(data, 1), 1);
data=(2*data)-1;
if checkboxphog==1
	if max(img1(:)>255)
		save listphog16.mat list;
	else
		save listphog8.mat list;
    	end
    	list=list(1:600);
end
if checkboxgist==1
    	if max(img1(:)>255)
		save listgist16.mat list;
	else
		save listgist8.mat list;
    	end
    	list=list(1:700);
end
save data.mat data;
data=data(:,list);
if checkboxphog==1
	if max(img1(:)>255)
		save rangesphog16.mat ranges;
		save minimumsphog16.mat minimums;
		model = svmtrain2(label,data,'-c 32 -g 0.0003');
		save modelphog16.mat model; 
	else
		save rangesphog8.mat ranges;
		save minimumsphog8.mat minimums;
		model = svmtrain2(label,data,'-c 32 -g 0.02');
		save modelphog8.mat model; 
    	end
end
if checkboxgist==1
    	if max(img1(:)>255)
		save rangesgist16.mat ranges;
		save minimumsgist16.mat minimums;
		model = svmtrain2(label,data,'-c 32 -g 0.0008');
		save modelgist16 model;
	else
		save rangesgist8.mat ranges;
		save minimumsgist8.mat minimums;
		model = svmtrain2(label,data,'-c 32 -g 0.04');
		save modelgist8 model;
    	end
end
clc;
msgbox('Training complete');
guidata(hObject, handles);
function load_classes()
curPath = pwd;

%% load weka jar, and common interfacing methods.
path(path, [curPath filesep 'lib']);
path(path, [curPath filesep 'lib' filesep 'weka']);
loadWeka(['lib' filesep 'weka']);

%% feature selection algorithms
path(path,[curPath filesep 'fs_sup_blogreg']);
path(path,[curPath filesep 'fs_sup_cfs']);
path(path,[curPath filesep 'fs_sup_chisquare']);
path(path,[curPath filesep 'fs_sup_fcbf']);
path(path,[curPath filesep 'fs_sup_fisher_score']);
path(path,[curPath filesep 'fs_sup_gini_index']);
path(path,[curPath filesep 'fs_sup_information_gain']);
path(path,[curPath filesep 'fs_sup_kruskalwallis']);
path(path,[curPath filesep 'fs_sup_mrmr']);
path(path,[curPath filesep 'fs_sup_relieff']);
path(path,[curPath filesep 'fs_sup_sbmlr']);
path(path,[curPath filesep 'fs_sup_ttest']);
path(path,[curPath filesep 'fs_uns_spec']);

%% predictors
path(path,[curPath filesep 'classifiers' filesep 'knn']);
path(path,[curPath filesep 'classifiers' filesep 'svm']);
path(path,[curPath filesep 'classifiers' filesep 'j48']);
path(path,[curPath filesep 'classifiers' filesep 'bayes']);
path(path,[curPath filesep 'clusters' filesep 'kmeans']);

%% data preprocessors
path(path,[curPath filesep 'preprocessor']);

%% evaluator
path(path,[curPath filesep 'evaluator' filesep 'fsevaluator']);

%% ability to run experiments.
%path(path, [curPath filesep 'examples' filesep 'code' filesep ...
%    'result_statistic' filesep 'supervised' filesep]);

clear curPath;
function [gabFea]=gab_fea(pic,AC,N,stage,orientation);
     A=[];
    B=[];
    F = create_Gabor(pic, AC, N, stage, orientation);
	A=[A F(:,1)];
	A=A';
	
    	B= [B F(:,2)];
    	B=B';
	gabFea=[A B];
    clearvars A B F pic;


% --- Executes on button press in mydicom.
function mydicom_Callback(hObject, eventdata, handles)
% hObject    handle to mydicom (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hint: get(hObject,'Value') returns toggle state of mydicom


% --- Executes on button press in myjpg.
function myjpg_Callback(hObject, eventdata, handles)
% hObject    handle to myjpg (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hint: get(hObject,'Value') returns toggle state of myjpg


% --- Executes on button press in togglebutton1.
function togglebutton1_Callback(hObject, eventdata, handles)
% hObject    handle to togglebutton1 (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hint: get(hObject,'Value') returns toggle state of togglebutton1


% --- Executes on selection change in listbox1.
function listbox1_Callback(hObject, eventdata, handles)
% hObject    handle to listbox1 (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: contents = cellstr(get(hObject,'String')) returns listbox1 contents as cell array
%        contents{get(hObject,'Value')} returns selected item from listbox1


% --- Executes during object creation, after setting all properties.
function listbox1_CreateFcn(hObject, eventdata, handles)
% hObject    handle to listbox1 (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: listbox controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


% --- Executes on selection change in popupmenu1.
function popupmenu1_Callback(hObject, eventdata, handles)
% hObject    handle to popupmenu1 (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: contents = cellstr(get(hObject,'String')) returns popupmenu1 contents as cell array
%        contents{get(hObject,'Value')} returns selected item from popupmenu1


% --- Executes during object creation, after setting all properties.
function popupmenu1_CreateFcn(hObject, eventdata, handles)
% hObject    handle to popupmenu1 (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: popupmenu controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


% --- Executes when selected object is changed in myradio.
function myradio_SelectionChangeFcn(hObject, eventdata, handles)
% hObject    handle to the selected object in myradio 
% eventdata  structure with the following fields (see UIBUTTONGROUP)
%	EventName: string 'SelectionChanged' (read only)
%	OldValue: handle of the previously selected object or empty if none was selected
%	NewValue: handle of the currently selected object
% handles    structure with handles and user data (see GUIDATA)


% --- Executes on button press in gist.
function gist_Callback(hObject, eventdata, handles)
% hObject    handle to gist (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)
checkboxphog = get(handles.phog,'Value');
                if checkboxphog==1
                    set(handles.phog,'Value', 0);
                end
% Hint: get(hObject,'Value') returns toggle state of gist


% --- Executes on button press in phog.
function phog_Callback(hObject, eventdata, handles)
% hObject    handle to phog (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)
checkboxgist = get(handles.gist,'Value');
                if checkboxgist==1
                    set(handles.gist, 'Value', 0);
                end
% Hint: get(hObject,'Value') returns toggle state of phog


% --- Executes during object creation, after setting all properties.
function gist_CreateFcn(hObject, eventdata, handles)
% hObject    handle to gist (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called
