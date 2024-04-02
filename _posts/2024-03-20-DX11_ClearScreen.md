---
layout: post
title: "DirectX11 튜토리얼 정리1: 화면 지우기"
category: 컴퓨터공학
tags: [C/C++, DX11, DirectX11]
---

## 튜토리얼 정리 시리즈 작성 계기

&emsp;개인적으로 공부할 때 C스타일 기반으로 쭉 따라가기만 하면 되게끔 작성된 코드가 여러점에서 이해하기 좋아서 그런 자료를 찾아보려고 많이 했습니다. 그런데 막상 찾아보면 OOP 스타일로 코드가 여기저기 흩어져 있거나 쓸 데 없이 함수로 빼놔서 굳이 함수 코드 위치 찾아가게끔 만들어놨거나 해서 내부 구현 이해를 위한 흐름이 다소 끊기는 게 많다는 느낌이었습니다. 그래서 어차피 기본 개념 알아두면 두고두고 써먹을텐데, 이참에 내 스타일대로 최대한 단순하게 정리해보자는 마음으로 시작해봅니다.

&emsp;그래픽스 이론에 대해서는 제가 아는 게 없기 때문에 참고해주십쇼!

&emsp;C스타일로 하면서 최대한 함수로 빼지 않고 정리를 덜하는 방향으로 코드를 작성할 예정입니다. 잘 추상화되고 정리된 코드를 원하신다면 다른 공개된 자료들이 훨씬 더 좋습니다!

## 결과
![결과 이미지](/assets/images/2024-03-20-DX11_ClearScreen_images/result.JPG)

&emsp;이렇게 윈도우에 바탕색을 채워 넣는 코드를 작성해볼 예정입니다. 콘솔창은 그냥 덤으로 같이 찍어본 것이니 오해하지 마시길!ㅋㅋㅋ

## 이번 게시글에서 사용할 전체 코드

**Jekyll 버그인지 코드 부분 부분에서 넣지도 않은 \가 출력되고 있네요. 참고해주십쇼!**

### C++

~~~ C++
#include <Windows.h>
#include <assert.h>

#include <d3d11.h>
#include <dxgi.h>

#pragma comment(lib, "d3d11.lib")
#pragma comment(lib, "dxgi.lib")

// 디버깅용 정적 콘솔 연결
#pragma comment(linker, "/entry:wWinMainCRTStartup /subsystem:console")

LRESULT CALLBACK WndProc(const HWND hWnd, const UINT message, const WPARAM wParam, const LPARAM lParam);
void InitializeD3D11();
void DestroyD3D11();
void Render();

HINSTANCE ghInstance;
HWND ghWnd;

const TCHAR* WINDOW_NAME = TEXT("DX11 Sample");

int APIENTRY wWinMain(_In_ HINSTANCE hInstance,
					  _In_opt_ HINSTANCE hPrevInstance,
					  _In_ LPWSTR    lpCmdLine,
					  _In_ int       nCmdShow)
{
	ghInstance = hInstance;

	// 윈도우 클래스 정의 및 등록
	WNDCLASS windowClass;
	ZeroMemory(&windowClass, sizeof(WNDCLASS));

	windowClass.lpfnWndProc = WndProc; // 콜백함수 등록
	windowClass.lpszClassName = WINDOW_NAME; // 클래스 이름 지정
	windowClass.hCursor = (HCURSOR)LoadCursor(nullptr, IDC_ARROW); // 기본 커서 지정
	windowClass.hInstance = hInstance; // 클래스 인스턴스 지정

	RegisterClass(&windowClass);
	assert(GetLastError() == ERROR_SUCCESS);

	// 실제 사용하게 될 화면 크기 지정
	// 여기서는 디스플레이의 가로 / 2, 세로 / 2 사용 예정
	RECT windowRect;
	windowRect.left = 0;
	windowRect.top = 0;
	windowRect.right = GetSystemMetrics(SM_CXSCREEN) >> 1; // 디스플레이 너비 / 2
	windowRect.bottom = GetSystemMetrics(SM_CYSCREEN) >> 1; // 디스플레이 높이 / 2

	AdjustWindowRect(
		&windowRect, // 값을 받을 RECT 구조체 주소
		WS_OVERLAPPEDWINDOW, // 크기를 계산할 때 참고할 윈도우 스타일
		false // 메뉴 여부
	);
	assert(GetLastError() == ERROR_SUCCESS);

	// 윈도우 생성
	ghWnd = CreateWindow(
		WINDOW_NAME, // 클래스 이름
		WINDOW_NAME, // 윈도우 이름
		WS_OVERLAPPEDWINDOW, // 윈도우 스타일
		CW_USEDEFAULT, CW_USEDEFAULT, // (x, y)
		windowRect.right, windowRect.bottom, // 너비, 높이
		nullptr, // 부모 윈도우 지정
		nullptr, // 메뉴 지정
		hInstance, // 인스턴스 지정
		nullptr // 추가 메모리 지정
	);
	assert(GetLastError() == ERROR_SUCCESS);
	InitializeD3D11(); // 윈도우 만들고 나서 D3D 초기화

	// 윈도우 보여주기
	ShowWindow(ghWnd, nCmdShow);
	assert(GetLastError() == ERROR_SUCCESS);

	// PeekMessage를 이용한 메시지 루프
	MSG msg;
	while (true)
	{
		if (PeekMessage(
			&msg, // 메시지를 받을 주소
			nullptr, // 메시지를 받을 윈도우
			0, // 받을 메시지 범위 최솟값
			0, // 받을 메시지 범위 최댓값
			PM_REMOVE // 메시지 처리 방법
		))
		{
			if (msg.message == WM_QUIT)
			{
				break;
			}

			TranslateMessage(&msg); // 메시지 문자로 해석 시도
			DispatchMessage(&msg); // 메시지 전달
		}
		else
		{
			Render();
			Sleep(1000 / 30);
		}
	}

	return (int)msg.wParam;
}

// 윈도우 콜백 함수
LRESULT CALLBACK WndProc(const HWND hWnd, const UINT message, const WPARAM wParam, const LPARAM lParam)
{
	switch (message)
	{
	case WM_DESTROY: // 윈도우 종료시 자원 해제 작업
		DestroyD3D11();
		PostQuitMessage(0);
		break;

	default:
		return DefWindowProc(hWnd, message, wParam, lParam);
	}

	return 0;
}

// D3D11에서 사용할 변수들
// Device: 리소스 생성
// DeviceContext: 렌더링에 사용할 정보를 담을 데이터 덩어리
// SwapChain: 버퍼를 디바이스에 렌더링하고 출력
// RenderTargetView: 리소스 뷰 중에서 렌더링 대상 용도
static ID3D11Device* spDevice;
static ID3D11DeviceContext* spDeviceContext;
static IDXGISwapChain* spSwapChain;
static ID3D11RenderTargetView* spRenderTargetView;

void InitializeD3D11()
{
	// 디바이스 생성 관련 정보
	UINT creationFlags = D3D11_CREATE_DEVICE_BGRA_SUPPORT;
#if DEBUG || _DEBUG
	creationFlags |= D3D11_CREATE_DEVICE_DEBUG;
#endif /* Debug */

	// 스왑체인에 대한 정보 초기화
	DXGI_SWAP_CHAIN_DESC swapChainDesc;
	ZeroMemory(&swapChainDesc, sizeof(swapChainDesc));

	// 현재 윈도우의 크기 구하기(작업 영역)
	RECT windowRect;
	GetClientRect(ghWnd, &windowRect);
	assert(GetLastError() == ERROR_SUCCESS);

	swapChainDesc.BufferCount = 1;
	swapChainDesc.BufferDesc.Width = windowRect.right;
	swapChainDesc.BufferDesc.Height = windowRect.bottom;
	swapChainDesc.BufferDesc.Format = DXGI_FORMAT_B8G8R8A8_UNORM; // 사용할 색상 포맷
	swapChainDesc.BufferDesc.RefreshRate.Numerator = 60; // 다시 그리는 주기의 분자
	swapChainDesc.BufferDesc.RefreshRate.Denominator = 1; // 다시 그리는 주기의 분모
	swapChainDesc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT; // 버퍼의 용도
	swapChainDesc.OutputWindow = ghWnd; // 렌더링한 결과물을 출력할 윈도우
	swapChainDesc.SampleDesc.Count = 1; // 픽셀당 샘플링하는 수
	swapChainDesc.SampleDesc.Quality = 0; // 이미지의 품질 수준
	swapChainDesc.Windowed = true; // 창모드 설정

	// 디바이스, 디바이스 컨텍스트, 스왑체인 생성
	// 최신 문서는 다른 방식으로 생성 권장 중
	HRESULT hr = D3D11CreateDeviceAndSwapChain(
		nullptr, // 어댑터 포인터
		D3D_DRIVER_TYPE_HARDWARE, // 사용할 드라이버
		nullptr, // 레스터라이저의 주소
		creationFlags, // 생성 플래그
		nullptr, // 지원할 버전 정보 배열
		0, // 버전 정보 배열의 길이
		D3D11_SDK_VERSION, // D3D SDK 버전
		&swapChainDesc, // 스왑체인 정보 구조체, 
		&spSwapChain, // 생성된 스왑체인의 포인터를 받을 주소
		&spDevice, // 생성된 디바이스의 포인터를 받을 주소
		nullptr, // 생성된 버전 정보를 받을 주소
		&spDeviceContext // 생성된 디바이스 컨텍스트의 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));

	// 렌더 타겟으로 사용할 버퍼 갖고 오기
	ID3D11Texture2D* pBackBuffer = nullptr;
	hr = spSwapChain->GetBuffer(
		0, // 사용할 버퍼 번호
		__uuidof(ID3D11Texture2D), // 버퍼를 해석할 때 사용할 인터페이스
		(void**)&pBackBuffer // 버퍼 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));

	// 렌더 타겟 뷰 생성
	hr = spDevice->CreateRenderTargetView(
		pBackBuffer, // 사용할 리소스 포인터
		nullptr, // 렌더 타겟 뷰 정보 구조체 포인터
		&spRenderTargetView // 만들어진 렌터 타겟 뷰의 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));
	pBackBuffer->Release();
	pBackBuffer = nullptr;

	// 렌더 타겟을 파이프라인 OM 단계에 설정
	spDeviceContext->OMSetRenderTargets(
		1, // 넣을 뷰의 수
		&spRenderTargetView, // 렌터 타겟 포인터 배열
		nullptr // 깊이 스텐실 뷰 포인터
	);

	// 뷰포트 정보 초기화
	D3D11_VIEWPORT viewPort;
	viewPort.Width = (FLOAT)windowRect.right;
	viewPort.Height = (FLOAT)windowRect.bottom;
	viewPort.MinDepth = 0.f;
	viewPort.MaxDepth = 1.f;
	viewPort.TopLeftX = 0;
	viewPort.TopLeftY = 0;

	// 뷰 포트 설정
	spDeviceContext->RSSetViewports(
		1, // 뷰포트의 수
		&viewPort // 정보 구조체 포인터
	);
}

void DestroyD3D11()
{
	if (spRenderTargetView != nullptr)
	{
		spRenderTargetView->Release();
		spRenderTargetView = nullptr;
	}

	if (spSwapChain != nullptr)
	{
		spSwapChain->Release();
		spSwapChain = nullptr;
	}

	if (spDeviceContext != nullptr)
	{
		spDeviceContext->Release();
		spDeviceContext = nullptr;
	}

	if (spDevice != nullptr)
	{
		spDevice->Release();
		spDevice = nullptr;
	}
}

void Render()
{
	const FLOAT clearColor[4] = { 209 / 255.f, 95 / 255.f, 238 / 255.f, 1.f };

	assert(spRenderTargetView != nullptr);
	spDeviceContext->ClearRenderTargetView(
		spRenderTargetView, // 대상 렌더 타겟 뷰
		clearColor // 채워 넣을 색상
	);

	spSwapChain->Present(
		1, // 동기화에 사용할 시간
		0 // 프레임 표현 옵션
	);
}
~~~

## 코드 살펴보기

### 사용할 라이브러리 및 컴파일러 옵션

~~~ C++
#include <Windows.h>
#include <assert.h>

#include <d3d11.h>
#include <dxgi.h>

#pragma comment(lib, "d3d11.lib")
#pragma comment(lib, "dxgi.lib")

// 디버깅용 정적 콘솔 연결
#pragma comment(linker, "/entry:wWinMainCRTStartup /subsystem:console")
~~~

&emsp;위 헤더랑 라이브러리를 링킹해서 사용할 예정입니다. <br>
&emsp;마지막 줄은 윈도우 어플리케이션 프로젝트에서 간단하게 콘솔 만드는 방법입니다! 다만 정적 방식이라 시작시 프로그램과 수명을 함께합니다.

### 윈도우 관련 코드

~~~ C++
	// 윈도우 생성
	ghWnd = CreateWindow(
		WINDOW_NAME, // 클래스 이름
		WINDOW_NAME, // 윈도우 이름
		WS_OVERLAPPEDWINDOW, // 윈도우 스타일
		CW_USEDEFAULT, CW_USEDEFAULT, // (x, y)
		windowRect.right, windowRect.bottom, // 너비, 높이
		nullptr, // 부모 윈도우 지정
		nullptr, // 메뉴 지정
		hInstance, // 인스턴스 지정
		nullptr // 추가 메모리 지정
	);
	assert(GetLastError() == ERROR_SUCCESS);
	InitializeD3D11(); // 윈도우 만들고 나서 D3D 초기화
~~~

&emsp;윈도우 프로그래밍 관련은 대부분 생략하도록 하겠습니다. 그냥 윈도우 어플리케이션 프로젝트로 만든 거에서 제 용도에 맞게 덜어낸 게 전부기도 하고요. 제가 전문가는 아니지만 기준이 되는 정형화된 코드에서 문서 보면서 넣고 빼고 하면 되는 것들이라 주석에 적은 내용 + 문서 보시면 충분할 거라 생각합니다!

&emsp;WM_CREATE에서 D3D11 초기화 안 하고 뒤늦게 초기화 해주고 있는데 왜 그런지는 똑똑한 여러분이라면 잘 아실거라 생각합니다(?). 사실 위 코드를 갖고온 이유가 그 부분 한 번 생각해볼만 한 것 같아서 따로 뽑아 봤습니다. ~~assert를 찬양합시다~~

### DirectX11

&emsp;일단 큰 흐름에서 이번 챕터를 살펴보면 다음과 같습니다.

1. 사용할 개체 포인터 선언
2. 각 개체별 초기화
3. 렌더 타겟 뷰 생성
4. 뷰를 파이프라인 OM(Output Merger) 단계에 바인딩
5. 뷰 포트 초기화
6. 뷰 포트를 RS 단계에 설정
7. 렌더링

#### 개체 포인터 선언

~~~ C++
// D3D11에서 사용할 변수들
// Device: 리소스 생성
// DeviceContext: 렌더링에 사용할 정보를 담을 데이터 덩어리
// SwapChain: 버퍼를 디바이스에 렌더링하고 출력
// RenderTargetView: 리소스 뷰 중에서 렌더링 대상 용도
static ID3D11Device* spDevice;
static ID3D11DeviceContext* spDeviceContext;
static IDXGISwapChain* spSwapChain;
static ID3D11RenderTargetView* spRenderTargetView;
~~~

&emsp;자세한 내용이 필요 없으시다면 주석 정도만 염두하고 넘어가시면 될 것 같고 저는 공부하는 겸 하나씩 정리해보려고 합니다. 각 개체에 대해서 보실 분들은 [D3D 11 개체 모델](#direct3d-11-개체-모델)에서 확인해주세요!

#### 각 개체별 초기화

&emsp;예전 문서 기준으로 작성하는터라 코드 자체는 옛날 방식입니다. 그래도 굳이 새로운 기능이 필요하지 않고 윈도우 스토어용 앱을 만들지 않는다면 크게 상관없을듯 하네요.

~~~ C++
	UINT creationFlags = D3D11_CREATE_DEVICE_BGRA_SUPPORT;
#if DEBUG || _DEBUG
	creationFlags |= D3D11_CREATE_DEVICE_DEBUG;
#endif /* Debug */
~~~

&emsp;생성시 넣어줄 플래그를 설정하는 부분입니다. 사실 이 예제에서는 없어도 될 수도 있는데 디버그 플래그 설정 샘플도 남길겸 넣어놨습니다ㅋㅋ

~~~ C++
// 스왑체인에 대한 정보 초기화
	DXGI_SWAP_CHAIN_DESC swapChainDesc;
	ZeroMemory(&swapChainDesc, sizeof(swapChainDesc));

	// 현재 윈도우의 크기 구하기(작업 영역)
	RECT windowRect;
	GetClientRect(ghWnd, &windowRect);
	assert(GetLastError() == ERROR_SUCCESS);

	swapChainDesc.BufferCount = 1;
	swapChainDesc.BufferDesc.Width = windowRect.right;
	swapChainDesc.BufferDesc.Height = windowRect.bottom;
	swapChainDesc.BufferDesc.Format = DXGI_FORMAT_B8G8R8A8_UNORM; // 사용할 색상 포맷
	swapChainDesc.BufferDesc.RefreshRate.Numerator = 60; // 다시 그리는 주기의 분자
	swapChainDesc.BufferDesc.RefreshRate.Denominator = 1; // 다시 그리는 주기의 분모
	swapChainDesc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT; // 버퍼의 용도
	swapChainDesc.OutputWindow = ghWnd; // 렌더링한 결과물을 출력할 윈도우
	swapChainDesc.SampleDesc.Count = 1; // 픽셀당 샘플링하는 수
	swapChainDesc.SampleDesc.Quality = 0; // 이미지의 품질 수준
	swapChainDesc.Windowed = true; // 창모드 설정

	// 디바이스, 디바이스 컨텍스트, 스왑체인 생성
	// 최신 문서는 다른 방식으로 생성 권장 중
	HRESULT hr = D3D11CreateDeviceAndSwapChain(
		nullptr, // 어댑터 포인터
		D3D_DRIVER_TYPE_HARDWARE, // 사용할 드라이버
		nullptr, // 레스터라이저의 주소
		creationFlags, // 생성 플래그
		nullptr, // 지원할 버전 정보 배열
		0, // 버전 정보 배열의 길이
		D3D11_SDK_VERSION, // D3D SDK 버전
		&swapChainDesc, // 스왑체인 정보 구조체, 
		&spSwapChain, // 생성된 스왑체인의 포인터를 받을 주소
		&spDevice, // 생성된 디바이스의 포인터를 받을 주소
		nullptr, // 생성된 버전 정보를 받을 주소
		&spDeviceContext // 생성된 디바이스 컨텍스트의 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));
~~~

&emsp;D3D11CreateDeviceAndSwapChain을 이용해서 Device, DeviceContext, SwapChain을 초기화합니다. <br>
&emsp;대부분은 문서 보시거나 하면 될텐데 버퍼 개수는 전체화면 모드로 생성할 때는 일반적으로 front buffer를 포함한다고 합니다. ~~막상 코드 보면서 설명하려니 할 내용이 없네요...ㅋㅋㅋㅋㅋ~~

~~~ C++
// 렌더 타겟으로 사용할 버퍼 갖고 오기
ID3D11Texture2D* pBackBuffer = nullptr;
hr = spSwapChain->GetBuffer(
	0, // 사용할 버퍼 번호
	__uuidof(ID3D11Texture2D), // 버퍼를 해석할 때 사용할 인터페이스
	(void**)&pBackBuffer // 버퍼 포인터를 받을 주소
);
assert(SUCCEEDED(hr));
~~~

&emsp;렌더 타겟으로 사용하기 위해서 버퍼를 가져와 줍니다. 저희는 결과적으로 2D 화면에 그릴 거고 버퍼에 그려놓은 걸 전송해서 그릴테니 2D 텍스쳐 리소스로 일종의 형변환을 해서 사용하게 됩니다.

#### 렌더 타겟 뷰 생성

~~~ C++
// 렌더 타겟 뷰 생성
hr = spDevice->CreateRenderTargetView(
	pBackBuffer, // 사용할 리소스 포인터
	nullptr, // 렌더 타겟 뷰 정보 구조체 포인터
	&spRenderTargetView // 만들어진 렌터 타겟 뷰의 포인터를 받을 주소
);
assert(SUCCEEDED(hr));
pBackBuffer->Release();
pBackBuffer = nullptr;
~~~

&emsp;받아온 버퍼로 렌더 타겟 뷰를 만들어 주고 이 예제에서는 더 이상 pBackBuffer는 필요 없으니 `Release()` 해줍니다. 렌터 타겟 뷰 DESC를 통해서 추가 정보를 줄 수 있습니다. 하지만 요번 튜토리얼에선 사용하지 않습니다. <br>
&emsp;만든 게 리소스 뷰 중 하나인데 리소스 뷰는

~~~ C
void* resources;
RenderTargetView* rtv = (RenderTargetView*)resources;
~~~

이런 식으로 사용하는 느낌이라고 보면 될 것 같네요.

#### 뷰를 파이프라인 OM(Output Merger) 단계에 바인딩

~~~ C++
	// 렌더 타겟을 파이프라인 OM 단계에 설정
	spDeviceContext->OMSetRenderTargets(
		1, // 넣을 뷰의 수
		&spRenderTargetView, // 렌터 타겟 포인터 배열
		nullptr // 깊이 스텐실 뷰 포인터
	);
~~~

&emsp;만든 뷰를 파이프라인에 바인딩 시켜줍니다. 이를 통해서 OM 단계의 결과물을 back buffer에 쓰도록 보장됩니다.

#### 뷰포트 초기화

~~~ C++
	// 뷰포트 정보 초기화
	D3D11_VIEWPORT viewPort;
	viewPort.Width = (FLOAT)windowRect.right;
	viewPort.Height = (FLOAT)windowRect.bottom;
	viewPort.MinDepth = 0.f;
	viewPort.MaxDepth = 1.f;
	viewPort.TopLeftX = 0;
	viewPort.TopLeftY = 0;
~~~

&emsp;클립 공간 좌표계를 매핑시키는 역할을 하는 뷰포트를 초기화합니다. DX11에서는 기본값이 없어서 반드시 해줘야 합니다.

##### 클립 공간 좌표계

$ X, Y [-1, 1], Z [0, 1] $ 범위로 정규화 시킨 공간이라고 합니다. 픽셀 공간이라고도 한다고 하네요.

#### 뷰 포트를 RS 단계에 설정

~~~ C++
	// 뷰 포트 설정
	spDeviceContext->RSSetViewports(
		1, // 뷰포트의 수
		&viewPort // 정보 구조체 포인터
	);
~~~

&emsp;만든 뷰 포트를 RS 단계에 바인딩 시켜줍니다.

#### 잊지 말아야 할 것

~~~ C++
void DestroyD3D11()
{
	if (spRenderTargetView != nullptr)
	{
		spRenderTargetView->Release();
		spRenderTargetView = nullptr;
	}

	if (spSwapChain != nullptr)
	{
		spSwapChain->Release();
		spSwapChain = nullptr;
	}

	if (spDeviceContext != nullptr)
	{
		spDeviceContext->ClearState();
		spDeviceContext->Release();
		spDeviceContext = nullptr;
	}

	if (spDevice != nullptr)
	{
		spDevice->Release();
		spDevice = nullptr;
	}
}
~~~

&emsp;초기화를 했으니 언제나 해제 작성부터 해줍니다ㅋㅋ 위 작성 스타일은 샘플 코드에서 따왔습니다. 스마트 포인터(ComPtr)를 쓸 수도 있는데 공부하는 입장이니 그런 자동적인 건 최대한 피하도록 합죠!

#### 렌더링

~~~ C++
void Render()
{
	const FLOAT clearColor[4] = { 209 / 255.f, 95 / 255.f, 238 / 255.f, 1.f };

	assert(spRenderTargetView != nullptr);
	spDeviceContext->ClearRenderTargetView(
		spRenderTargetView, // 대상 렌더 타겟 뷰
		clearColor // 채워 넣을 색상
	);

	spSwapChain->Present(
		1, // 동기화에 사용할 시간
		0 // 프레임 표현 옵션
	);
}
~~~

&emsp;단순히 바탕색을 채우는 건 DeviceContext에서 `ClearRenderTargetView()`를 통해서 간단하게 할 수 있습니다. 단, 이건 그냥 버퍼에 쓰기만 하는 거고 실제로 화면에 뿌려지는 시점은 SwapChain의 `Present()` 호출한 이후가 됩니다. 그리고 이건 다른 걸 렌더링할 때도 마찬가지입니다.

절차를 축약해서 표현하면

1. 여차저차 해서 back buffer에 열심히 렌더링하고
2. Present로 버퍼를 flipping해서 그리기

이런 느낌이 될 것 같습니다.

## Direct3D 11 개체 모델

&emsp;리소스 생성과 렌더링 기능을 한 개 이상의 컨텍스트로 분리해서 멀티스레딩에 용이함 추구하기 위해 디자인됨

### Device

- 디바이스는 리소스 생성과 디스플레이 어댑터의 기능들을 열거에 사용
- 프로그램 하나당 적어도 한 개의 디바이스가 필요하며 한 개 이상의 DeviceContext에서 활용됨
- `D3D11CreateDevice(), D3D11CreateDeviceAndSwapChain()`으로 생성

### DeviceContext

- 디바이스가 사용될 환경 또는 설정을 포함
- 파이프라인 단계를 설정하고 디바이스가 소유한 리소스를 사용해서 렌더링 명령어를 생성
- 즉시 렌더링과 지연 렌더링 두 개의 유형이 있지만 모두 ID3D11DeviceContext 인터페이스 사용함

#### Immediate Context

- 드라이버에 직접적으로 렌더링
- 각 디바이스별로 GPU 데이터를 얻어올 수 있는 Immediate Context를 하나만 가짐
- 명령어 리스트를 즉시 렌더링하는 데 사용 가능
  - 문서에서 render를 리스트를 재생한다는 느낌인지 (or play back)으로 표현하네요
- 다음 함수를 통해서 얻어올 수 있음
  - `D3D11CreateDevice()`
  - `D3D11CreateDeviceAndSwapChain()`
  - `ID3D11Device::GetImmediateContext()`

#### Deferred Context

- GPU 명령어들을 명령어 리스트에 기록함
- 멀티스레딩용으로 주로 사용되며 싱글스레드에선 필요하진 않음
- 메인 렌더링 스레드 대신 사용하는 작업 스레드에서 일반적으로 사용
- 생성시 Immediate Context의 어떠한 상태도 상속받지는 않음
- `ID3D11Device::CreateDefferedContext()`로 얻어옴
- 한 번에 한 스레드에서만 사용되면 Immediate, Deffered 모두 사용 가능

### SwapChain

- 렌더링 및 표시에 사용되는 둘 이상의 버퍼를 캡슐화한 인터페이스
- swapping(or flipping) 절차를 사용
  - 두 개 이상의 버퍼를 만들어 표시될 버퍼(front buffer)와 그릴 버퍼(back buffer)로 구분
  - back buffer에 장면을 그려넣고 front buffer랑 교환(swap)
  - front buffer가 된 버퍼의 내용이 화면에 전송

#### 관련 키워드
- 더블버퍼링(Double Buffering)

### RenderTargetView

- 리소스뷰 중 하나
- 렌더링하는 동안 접근할 수 있는 렌더링 대상(Render Target)의 서브리소스(Subresources)를 식별
  - Render Target은 파이프라인 OM 단계에 의해서 작성될 수 있는 리소스
- `ID3D11Device::CreateRenderTargetView()`를 통해 생성
- `ID3D11DeviceContext::OMSetRenderTargets()`으로 OM 단계 설정
  - OM(Output merger)는 최종 픽셀 색을 결정하는 그래픽 파이프라인 중 마지막 단계

### Resource

- D3D 파이프라인이 접근할 수 있는 메모리 영역
- 파이프라인에 대한 데이터를 제공하고 장면(Scene)에서 무엇이 렌더링 될지 정의하는 빌딩 블록 역할
- 텍스쳐(Texture), 정점 데이터(Vertex data), 쉐이더 데이터(Shader data) 등이 있음
- 강타입(Strong Type)과 약타입(Weak Type)이 있음
  - 리소스가 만들어질 때 형이 정해지면 강타입
  - 파이프라인에 바인딩될 때 정해지면 약타입

#### ResourceViews

- 타입이 없는(Typeless) 약 타입 리소스에 사용 가능
  - 메모리 덩어리를 형변환해서 사용하는 느낌
  - 단, 요소당 비트의 수가 같아야 됨
- 데이터를 해석하는 방식은 만들 때 설정한 형식(format)에 의존함
  - R8G8B8A8_TYPELESS으로 설정했다면 타입이 없어도 R32_FLOAT으로는 사용 불허

#### Subresources

- 리소스의 부분 집합
- 리소스는 하나 이상의 서브 리소스로 구성
  - 버퍼도 단일 서브 리소스 중 하나

### Viewport

- 클립 공간 속 정점(Vertex)의 위치를 렌더링 대상(Render Target) 위치에 매핑할 때 사용할 정보를 줌
  - 3차원 물체를 스크린 2차원 좌표계에 매핑하는 그런 일들을 RS(Rasterizer Stage) 단계에서 수행
- 한 번에 하나씩만 활성화 설정 가능
- 렌더링 대상과 다른 크기로 설정 가능

위키피디아에서는 그래픽스에서 영역을 보여주는 폴리곤 정도로 설명하네요.
웹쪽 관점에서 쓴 글을 보니 윈도우 프로그래밍 관점으로 설명하면 작업영역 느낌인 것 같기도 하고요.

## 소스코드 깃 주소

[ClearScreen](https://github.com/redbindy/DX11ForPost/tree/master/ClearScreen)

## 참고자료 및 출처
- [DirectX-SDK-Samples](https://github.com/walbourn/directx-sdk-samples)
- [Table of Color](https://www.farb-tabelle.de/en/table-of-color.htm)
- [MSDN - Introduction to a Device in Direct3D 11](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-devices-intro)
- [MSDN - What Is a Swap Chain? (Direct3D 9)](https://learn.microsoft.com/en-us/windows/win32/direct3d9/what-is-a-swap-chain-)
- [MSDN - How To: Create a Swap Chain](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-devices-create-swap-chain)
- [MSDN - ID3D11RenderTargetView interface (d3d11.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nn-d3d11-id3d11rendertargetview)
- [MSDN - Resources](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-resources)
- [MSDN - Graphics pipeline](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-graphics-pipeline)
- [MSDN - Getting Started with the Rasterizer Stage](https://learn.microsoft.com/en-us/windows/win32/direct3d11/d3d10-graphics-programming-guide-rasterizer-stage-getting-started)
- [Wikipedia - Viewport](https://en.wikipedia.org/wiki/Viewport)
- [Neul_bo.log - viewport란?](https://velog.io/@ken1204/viewport%EB%9E%80)
- [Beantin - What is my viewport size and pixel density?](https://beantin.net/what-is-my-viewport-size-pixel-density/)
- [MSDN - D3D11CreateDeviceAndSwapChain function (d3d11.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-d3d11createdeviceandswapchain)
- [MSDN - Quickstart: set up DirectX resources and display an image](https://learn.microsoft.com/en-us/previous-versions/windows/apps/jj552952(v=win.10))
- [MSDN - DXGI_SWAP_CHAIN_DESC structure (dxgi.h)](https://learn.microsoft.com/en-us/windows/win32/api/dxgi/ns-dxgi-dxgi_swap_chain_desc)
- [자기계발을 멈추면 죽는다 - 윈도우 응용프로그램에서 콘솔창 띄우기](https://skmagic.tistory.com/394)