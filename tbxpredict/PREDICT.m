function varargout = PREDICT(varargin)
%clear;
%clc;
% predictgab MATLAB code for predictgab.fig
%      predictgab, by itself, creates a new predictgab or raises the existing
%      singleton*.
%
%      H = predictgab returns the handle to a new predictgab or the handle to
%      the existing singleton*.
%
%      predictgab('CALLBACK',hObject,eventData,handles,...) calls the local
%      function named CALLBACK in predictgab.M with the given input arguments.
%
%      predictgab('Property','Value',...) creates a new predictgab or raises the
%      existing singleton*.  Starting from the left, property value pairs are
%      applied to the GUI before predictgab_OpeningFcn gets called.  An
%      unrecognized property name or invalid value makes property application
%      stop.  All inputs are passed to predictgab_OpeningFcn via varargin.
%
%      *See GUI Options on GUIDE's Tools menu.  Choose "GUI allows only one
%      instance to run (singleton)".
%
% See also: GUIDE, GUIDATA, GUIHANDLES

% Edit the above text to modify the response to help predictgab

% Last Modified by GUIDE v2.5 13-Sep-2013 15:54:48

% Begin initialization code - DO NOT EDIT
gui_Singleton = 1;
gui_State = struct('gui_Name',       mfilename, ...
                   'gui_Singleton',  gui_Singleton, ...
                   'gui_OpeningFcn', @predictgab_OpeningFcn, ...
                   'gui_OutputFcn',  @predictgab_OutputFcn, ...
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


% --- Executes just before predictgab is made visible.
function predictgab_OpeningFcn(hObject, eventdata, handles, varargin)
% This function has no output args, see OutputFcn.
% hObject    handle to figure
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)
% varargin   command line arguments to predictgab (see VARARGIN)

% Choose default command line output for predictgab
handles.output = hObject;

% Update handles structure
guidata(hObject, handles);

% UIWAIT makes predictgab wait for user response (see UIRESUME)
% uiwait(handles.figure1);


% --- Outputs from this function are returned to the command line.
function varargout = predictgab_OutputFcn(hObject, eventdata, handles) 
% varargout  cell array for returning output args (see VARARGOUT);
% hObject    handle to figure
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Get default command line output from handles structure
varargout{1} = handles.output;
set(handles.gist, 'Value', 1);

% --- Executes during object creation, after setting all properties.
function axes1_CreateFcn(hObject, eventdata, handles)
% hObject    handle to axes1 (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called
% Hint: place code in OpeningFcn to populate axes1
axes(hObject);
%I=dicomread('/home/arun/server_backup/newdata/1.jpg');
imshow(I);


% --- Executes on button press in train_push.
function train_push_Callback(hObject, eventdata, handles)
% hObject    handle to train_push (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)
%handles.output = hObject;


% --- Executes on button press in br_test_push.
function br_test_push_Callback(hObject, eventdata, handles)
% hObject    handle to br_test_push (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

indirtest=uigetdir;
set(handles.edit_br,'string',indirtest);

% --- Executes on button press in predict_push.
function predict_push_Callback(hObject, eventdata, handles)
% hObject    handle to predict_push (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)
clear param
param.imageSize = [1024 1024]; % it works also with non-square images
param.fc_prefilt = 4;
checkboxgist = get(handles.gist,'Value');
checkboxphog = get(handles.phog,'Value');
Gab=[];
label=[];
bin = 8;
angle = 360;
L=3;
roi = [100;900;100;900];
indte=get(handles.edit_br,'string');
s = dir(fullfile(indte, '*'));
if length(s)<3
	msgbox('No data to predict')
	return;
end
progressbar('Predicting')%,'Normal data training')

for i = 3:length(s)
	pause(0.01) % Do something important
    	progressbar(i/length(s))
	if length(regexpi(s(i).name, 'n'))>0
		label=[label;2];
	end
	complete = strcat(indte,'/',s(i).name);
	%label=[label;1];
        if length(regexpi(s(3).name, 'jpg'))>0
		img1=imread(complete);
	else
		img1=dicomread(complete);
	end
	img1=imresize(img1,[1024 1024]);
		if max(img1(:)>255)
		if length(regexpi(s(i).name, 'p'))>0
         		label=[label;1];
         	end
        else
        	if length(regexpi(s(i).name, 'p'))>1
         		label=[label;1];
         	end
     	end
	if max(img1(:)>255)
    		param.numberBlocks = 8;
    		param.orientationsPerScale = [8 8 8 8];
	else
		param.orientationsPerScale = [12 12 12 12];
		param.numberBlocks = 4;    
	end
	if checkboxphog==1
		if max(img1(:)>255)
			load rangesphog16;
			load minimumsphog16;
			load modelphog16;
        		load listphog16;
		else
			load rangesphog8;
			load minimumsphog8;
			load modelphog8;
        		load listphog8;
    		end
    		myvec = anna_phog(img1,bin,angle,L,roi);
    		myvec=myvec';
	end
	if checkboxgist==1
    		if max(img1(:)>255)
			load rangesgist16;
			load minimumsgist16;
			load modelgist16;
        		load listgist16;
		else
			load rangesgist8;
			load minimumsgist8;
			load modelgist8;
        		load listgist8;
    		end
    		[myvec] = createGist(img1, '', param);
	end
    Gab=[Gab;myvec];
end
nGist=double(Gab(:,list));
nGist = (nGist - repmat(minimums, size(nGist, 1), 1)) ./ repmat(ranges, size(nGist, 1), 1);
nGist=(2*nGist)-1;
if checkboxphog==1
    	list=list(1:600);
end
if checkboxgist==1
    	list=list(1:700);
end
save nGist.mat nGist;
nGist=nGist(:,list);
[predicted_label, accuracy, decision_values] = svmpredict(label, nGist, model);
save labels.mat predicted_label label; 
scrollim(s,predicted_label,indte);
%clc;
msgbox('Prediction complete');

function edit_br_Callback(hObject, eventdata, handles)
% hObject    handle to edit_br (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_br as text
%        str2double(get(hObject,'String')) returns contents of edit_br as a double


% --- Executes during object creation, after setting all properties.
function edit_br_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_br (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


% --- Executes during object creation, after setting all properties.
function axes2_CreateFcn(hObject, eventdata, handles)
% hObject    handle to axes2 (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: place code in OpeningFcn to populate axes2
axes(hObject);
imshow('1.jpg');

imshow(imageArray, []);

% Turn the handlevisibility off so that we don't inadvertently plot into the axes again
% Also, make the axes invisible
function [gabFea]=gab_fea(pic,AC,N,stage,orientation)
     A=[];
    B=[];
    F = create_Gabor(pic, AC, N, stage, orientation);
	A=[A F(:,1)];
	A=A';
	
    	B= [B F(:,2)];
    	B=B';
	gabFea=[A B];
    clearvars A B F pic;


% --- Executes on key press with focus on predict_push and none of its controls.
function predict_push_KeyPressFcn(hObject, eventdata, handles)
% hObject    handle to predict_push (see GCBO)
% eventdata  structure with the following fields (see UICONTROL)
%	Key: name of the key that was pressed, in lower case
%	Character: character interpretation of the key(s) that was pressed
%	Modifier: name(s) of the modifier key(s) (i.e., control, shift) pressed
% handles    structure with handles and user data (see GUIDATA)


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
