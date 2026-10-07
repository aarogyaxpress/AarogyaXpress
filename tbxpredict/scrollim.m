function scrollim(s,predicted_label,indtb)
w = 600; h = 500;           %# width/height of figure
handles.hFig = figure('Menubar','figure', 'Resize','off', ...
    'Units','pixels', 'Position',[200 200 w h]);
handles.hPan = uipanel('Parent',handles.hFig, ...
    'Units','pixels', 'Position',[0 0 w-20 h]);
handles.hSld = uicontrol('Parent',handles.hFig, ...
    'Style','slider', 'Enable','off', ...
    'Units','pixels', 'Position',[w-20 0 20 h], ...
    'Min',0-eps, 'Max',0, 'Value',0, ...
    'Callback',{@onSlide,handles.hPan});
hAx = zeros(7,1);
clr = lines(7);
fileID = fopen('Result.txt','w');
for i=3:length(s)
    myi=i-2;
    hAx(myi) = addAxis(handles);
    complete = strcat(indtb,'/',s(i).name);
    %img1 = imread(complete);
    if regexpi(s(i).name, 'jpg')>0
            img1 = imread(complete);
        else
         img1 = dicomread(complete);
    end
    img1=imresize(img1,[256 256]);
    imshow(img1);
    k=s(i).name;
    if predicted_label(myi)==1
        fprintf(fileID,'%6s %12s\n',complete,'Suspected TB');
    	title(hAx(myi), sprintf('%s (Suspected TB)',k))
    	
    end
    if predicted_label(myi)==2
        fprintf(fileID,'%6s %12s\n',complete,'Normal');
    	title(hAx(myi), sprintf('%s (Normal)',k))
    	
    end
    	
   % title(hAx(i), sprintf('plot %s',k))
    %title(hAx(i), sprintf('plot %s',k))
    %pause(1)   %# slow down so that we can see the updates
end


