#import "SpeechRecognitionBridge.h"
#import <AVFoundation/AVFoundation.h>

@interface SpeechRecognitionBridge ()
@property (nonatomic, strong) SFSpeechRecognizer *speechRecognizer;
@property (nonatomic, strong) SFSpeechAudioBufferRecognitionRequest *recognitionRequest;
@property (nonatomic, strong) SFSpeechRecognitionTask *recognitionTask;
@property (nonatomic, strong) AVAudioEngine *audioEngine;
@end

@implementation SpeechRecognitionBridge

RCT_EXPORT_MODULE(SpeechRecognition);

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _audioEngine = [[AVAudioEngine alloc] init];
    }
    return self;
}

RCT_EXPORT_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    BOOL available = [SFSpeechRecognizer class] != nil && 
                    [SFSpeechRecognizer authorizationStatus] != SFSpeechRecognizerAuthorizationStatusDenied;
    resolve(@(available));
}

RCT_EXPORT_METHOD(requestPermissions:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [SFSpeechRecognizer requestAuthorization:^(SFSpeechRecognizerAuthorizationStatus authStatus) {
        dispatch_async(dispatch_get_main_queue(), ^{
            switch (authStatus) {
                case SFSpeechRecognizerAuthorizationStatusAuthorized:
                    resolve(@(YES));
                    break;
                case SFSpeechRecognizerAuthorizationStatusDenied:
                case SFSpeechRecognizerAuthorizationStatusRestricted:
                case SFSpeechRecognizerAuthorizationStatusNotDetermined:
                default:
                    resolve(@(NO));
                    break;
            }
        });
    }];
}

RCT_EXPORT_METHOD(recognizeAudio:(NSString *)audioUri
                  language:(NSString *)language
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    // Check permissions first
    if ([SFSpeechRecognizer authorizationStatus] != SFSpeechRecognizerAuthorizationStatusAuthorized) {
        reject(@"permission_denied", @"Speech recognition permission not granted", nil);
        return;
    }
    
    // Create speech recognizer for specified language
    NSLocale *locale = [NSLocale localeWithLocaleIdentifier:language];
    self.speechRecognizer = [[SFSpeechRecognizer alloc] initWithLocale:locale];
    
    if (!self.speechRecognizer.isAvailable) {
        reject(@"not_available", @"Speech recognizer not available for this language", nil);
        return;
    }
    
    // Convert file:// URI to path
    NSURL *audioURL = [NSURL URLWithString:audioUri];
    if (!audioURL || ![[NSFileManager defaultManager] fileExistsAtPath:audioURL.path]) {
        reject(@"file_not_found", @"Audio file not found", nil);
        return;
    }
    
    // Create recognition request
    SFSpeechURLRecognitionRequest *request = [[SFSpeechURLRecognitionRequest alloc] initWithURL:audioURL];
    request.shouldReportPartialResults = NO;
    
    // Start recognition
    self.recognitionTask = [self.speechRecognizer recognitionTaskWithRequest:request
                                                               resultHandler:^(SFSpeechRecognitionResult * _Nullable result, NSError * _Nullable error) {
        if (error) {
            reject(@"recognition_error", error.localizedDescription, error);
            return;
        }
        
        if (result.isFinal) {
            NSString *transcription = result.bestTranscription.formattedString;
            resolve(transcription ?: @"");
        }
    }];
}

RCT_EXPORT_METHOD(stopRecognition:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (self.recognitionTask) {
        [self.recognitionTask cancel];
        self.recognitionTask = nil;
    }
    resolve(@(YES));
}

- (void)dealloc {
    if (self.recognitionTask) {
        [self.recognitionTask cancel];
    }
}

@end