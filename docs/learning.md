
Chương 1: Xây dựng nền tảng với React (Building a Foundation in React)
Mục tiêu học tập: Hiểu rõ triết lý thiết kế giao diện dạng khai báo (declarative) và cách tư duy theo các thành phần giao diện (component) của React làm nền tảng trước khi bước vào môi trường di động
.
Nội dung lý thuyết: Tìm hiểu về thư viện React, cú pháp lai JSX, cơ chế Virtual DOM giúp tối ưu hiệu năng hiển thị, cách truyền dữ liệu thông qua props (thuộc tính), kiểm tra kiểu dữ liệu với PropTypes, quản lý trạng thái nội bộ state và vòng đời của một component (Component Lifecycle)
.
Thực hành dự án:
Thực hành phân tích và bóc tách một giao diện News Feed (Trang tin tức) trên giấy thành cấu trúc cây component lồng nhau bao gồm các thành phần nhỏ: NewdsFeed, NewsItem, Image, Title, Description, và Byline
.
Viết thử nghiệm các component cơ bản bằng React lớp (Class component) hoặc component hàm (Functional component)
.
Chương 2: Hello World trong React Native (Saying HelloWorld in React Native)
Mục tiêu học tập: Làm quen với kiến trúc hoạt động của React Native (sử dụng engine JavaScriptCore và cơ chế cầu nối - Bridge) so với các giải pháp khác như PhoneGap, Ionic hay NativeScript
.
Nội dung lý thuyết: Tìm hiểu bộ công cụ phát triển bao gồm Xcode, Homebrew, Node.js, Watchman giúp tự động phát hiện thay đổi mã nguồn, và React Native CLI
. Học cách gỡ lỗi (debugging) sử dụng Chrome Developer Tools và thiết lập các điểm dừng (breakpoints)
.
Thực hành dự án:
Cài đặt toàn bộ môi trường phát triển trên hệ điều hành macOS
.
Khởi tạo dự án đầu tiên bằng lệnh react-native init HelloWorld, biên dịch và khởi chạy thành công ứng dụng trên máy ảo iOS Simulator
.
Tiến hành chỉnh sửa giao diện cơ bản và thực hiện nạp lại tức thì (reload) trực tiếp trên máy ảo
.
Chương 3: Styling và Layout trong React Native (Styling and Layout in React Native)
Mục tiêu học tập: Làm chủ hệ thống định kiểu giao diện dựa trên JavaScript và hệ thống bố cục Flexbox
.
Nội dung lý thuyết: Hiểu sự khác biệt giữa CSS trên Web và Styling trong di động (không có tính kế thừa ngoại trừ component Text, không có CSS selector toàn cục giúp tránh xung đột giao diện)
. Học về mô hình Box Model, hệ trục Flexbox (trục chính và trục phụ) cùng các thuộc tính căn chỉnh quan trọng
. Tìm hiểu cách thiết kế responsive qua API Dimensions và sự kiện onLayout
.
Thực hành dự án:
Tạo và định kiểu cho các nút bấm tùy chỉnh sử dụng StyleSheet.create và thuộc tính đặc thù StyleSheet.hairlineWidth để hiển thị đường viền siêu mảnh đồng nhất trên các mật độ điểm ảnh khác nhau
.
Thiết kế thử nghiệm các bố cục nhiều cột, căn chỉnh khoảng cách, định dạng hiển thị ảnh (Image) với các chế độ thu phóng như cover, contain, stretch
.
Chương 4: Bắt đầu dự án thực tế với các React Native Component (Starting our Project with React Native Components)
Mục tiêu học tập: Làm quen với các component và API cốt lõi được React Native cung cấp sẵn để bắt đầu dự án thực tế
.
Thực hành dự án - Khởi động dự án Readly (RNNYT):
Khởi tạo dự án đọc tin tức chính mang tên RNNYT bằng câu lệnh react-native init RNNYT và cấu trúc các thư mục mã nguồn rõ ràng (src/components, src/styles)
.
Xây dựng các component cơ bản tự định nghĩa: AppText, SmallText, Byline, và Thumbnail bằng cách bao bọc (compose) các thành phần giao diện gốc như Text, View, Image
.
Ghép nối các thành phần trên lại thành một khối tin tức hoàn chỉnh NewsItem
.
Sử dụng TouchableOpacity để tạo hiệu ứng phản hồi xúc giác khi người dùng nhấn vào tin tức
.
Hiển thị danh sách tin tức cuộn mượt mà bằng ListView kết hợp với DataSource
.
Thiết kế cấu trúc điều hướng đa tab cho ứng dụng thông qua TabBarIOS (gồm các tab Featured, Search, và Bookmarks)
.
Hoàn thiện tính năng xem tin tức chi tiết bằng cách mở một Modal tràn màn hình chứa component WebView để hiển thị trang web gốc của bài báo
.
Sử dụng các API hệ điều hành như ActionSheetIOS (hiển thị trình đơn bookmark khi nhấn giữ bài viết), Alert cảnh báo, Vibration tạo độ rung của thiết bị, và tùy biến thanh trạng thái StatusBar
.
⚙️ PHẦN 2: QUẢN LÝ LUỒNG DỮ LIỆU & TÍCH HỢP API (Chương 5 - Chương 6)
Chương 5: Flux và Redux (Flux and Redux)
Mục tiêu học tập: Nắm vững kiến trúc dòng dữ liệu một chiều (unidirectional data flow) để quản lý trạng thái của các ứng dụng có quy mô vừa và lớn
.
Nội dung lý thuyết: Hiểu động cơ ra đời của Flux nhằm giải quyết sự phức tạp của mô hình MVC truyền thống
. Học 3 nguyên lý cốt lõi của Redux (nguồn chân lý duy nhất, trạng thái chỉ đọc/bất biến, thay đổi bằng các hàm thuần khiết reducer)
. Sử dụng thư viện react-redux với thành phần Provider và hàm connect để tách biệt giao diện trình diễn (presentational component) với quản lý logic (container component)
.
Thực hành dự án phụ - Xây dựng App đếm Countly:
Khởi tạo dự án phụ Countly để thực hành thực tế
.
Tự viết một hệ thống Flux thủ công bằng cách triển khai một Dispatcher đơn lồng (singleton) để phân phát các hành động (Actions) đến bộ lưu trữ Store (kế thừa từ EventEmitter của React Native) để cập nhật giao diện
.
Tiến hành refactor (tái cấu trúc) toàn bộ dự án Countly sang sử dụng thư viện Redux và React-Redux giúp thu gọn mã nguồn một cách tối ưu
.
Chương 6: Tích hợp với NYT API và Redux (Integrating with the NYT API and Redux)
Mục tiêu học tập: Kết nối ứng dụng đọc báo với máy chủ thực tế và đưa kiến trúc Redux vào quản lý dữ liệu cho ứng dụng chính RNNYT
.
Thực hành dự án RNNYT:
Tổ chức lại cấu trúc thư mục dự án theo vai trò của Redux (tạo các thư mục độc lập gồm actions, components, containers, reducers, selectors trong thư mục src)
.
Thiết kế cây trạng thái Redux (Redux state tree) bao gồm các trạng thái quản lý danh sách tin tức và từ khóa tìm kiếm (news, searchTerm)
.
Viết các Action và Reducer đồng bộ ban đầu kết hợp với tệp dữ liệu giả mockData.json có cấu trúc chuẩn như API của tờ báo New York Times
.
Viết bộ lọc trung gian chuyển đổi dữ liệu (dataTransformations.js) nhằm định hình lại các trường thông tin nhận về từ API (ví dụ: chuyển đổi byline thành tác giả, định dạng lại ngày tháng với thư viện moment)
.
Áp dụng thư viện reselect để xây dựng các bộ chọn tối ưu (memoized selectors), giúp tránh re-render và tính toán lại dữ liệu không cần thiết khi bộ dữ liệu gốc chưa thay đổi
.
Nâng cấp lên luồng bất đồng bộ: Sử dụng API fetch của React Native để gửi yêu cầu mạng thực tế lên máy chủ của New York Times và xử lý dữ liệu trả về thông qua Middleware redux-promise
.
Thiết kế hoàn chỉnh màn hình Search cho phép lọc tin tức động theo thời gian thực
.
Thêm hoạt ảnh chỉ báo tải dữ liệu ActivityIndicator (loading spinner) và trình điều khiển kéo để làm mới RefreshControl (pull-to-refresh)
.
🛠️ PHẦN 3: ĐIỀU HƯỚNG NÂNG CAO, HOẠT ẢNH & ANDROID (Chương 7 - Chương 9)
Chương 7: Điều hướng và các API nâng cao (Navigation and Advanced APIs)
Mục tiêu học tập: Giải quyết bài toán chuyển trang chuyên sâu và lưu trữ dữ liệu bền vững trên thiết bị
.
Nội dung lý thuyết: Hiểu rõ bức tranh toàn cảnh về hệ thống điều hướng trong React Native (so sánh tính năng của Navigator cũ và bộ công cụ khai báo, phi trạng thái NavigationExperimental)
.
Thực hành dự án RNNYT:
Tạo màn hình giới thiệu ban đầu IntroScreen và sử dụng Navigator cơ bản để chuyển hướng đến màn hình chính
.
Thiết lập thanh tiêu đề điều hướng (Navigation Bar) với nút Back quay lại trang trước
.
Thực hiện nâng cấp toàn bộ hệ thống điều hướng lên NavigationExperimental, đưa toàn bộ trạng thái di chuyển trang, trạng thái chuyển đổi tab, và trạng thái đóng/mở Modal hiển thị bài viết vào quản lý tập trung trong Redux Store
.
Tích hợp các API nâng cao:
NetInfo: Lắng nghe trạng thái kết nối mạng của điện thoại để hiển thị thông báo offline khi mất kết nối mạng
.
Linking: Bổ sung nút bấm trong Modal cho phép người dùng mở trực tiếp link bài báo bằng trình duyệt mặc định bên ngoài thiết bị
.
AsyncStorage: Lưu trữ danh sách bài viết đã lưu (bookmarks) cục bộ dưới dạng khóa - giá trị lưu trữ lâu dài trên thiết bị để tải lại khi mở app
.
Chương 8: Hoạt ảnh và Cử chỉ trong React Native (Animation and Gestures in React Native)
Mục tiêu học tập: Tạo các hiệu ứng hoạt ảnh mượt mà 60fps và xử lý cử chỉ vuốt chạm của người dùng
.
Nội dung lý thuyết: So sánh cơ chế hoạt động của LayoutAnimation (nhanh, tự động chạy khi render lại) và Animated API (tùy biến chi tiết, điều khiển theo thời gian thực)
. Tìm hiểu cách theo dõi cử chỉ chạm qua PanResponder
.
Thực hành dự án RNNYT:
Thiết kế giao diện giới thiệu ứng dụng ban đầu (Onboarding) gồm 4 màn hình màu sắc khác nhau
.
Áp dụng LayoutAnimation để tạo hiệu ứng chuyển tiếp mượt mà khi bấm Next/Previous giữa các trang onboarding, và hoạt ảnh thu gọn màn hình theo phương thẳng đứng (với CollapsibleView) khi nhấn nút Done
.
Nâng cấp hoạt ảnh phức tạp bằng Animated API: Sử dụng Animated.View kết hợp thuộc tính biến đổi translateX để tạo hiệu ứng trượt mượt mà theo cử động của người dùng
.
Sử dụng phương thức nội suy interpolate để ánh xạ khoảng cách trượt của màn hình sang chiều rộng tăng dần của thanh tiến trình (Progress Bar) hiển thị bên dưới
.
Tích hợp bộ xử lý cử chỉ PanResponder cho phép người dùng dùng ngón tay vuốt trực tiếp lên màn hình để lật qua lại giữa các trang onboarding thay vì phải bấm nút
.
Thêm logic chặn biên để người dùng không thể vuốt quá giới hạn của trang đầu tiên hoặc trang cuối cùng
.
Chương 9: Tái cấu trúc ứng dụng cho Android (Refactoring for Android)
Mục tiêu học tập: Chuyển đổi và tối ưu hóa ứng dụng đã xây dựng để ứng dụng hoạt động tốt trên cả hệ điều hành Android
.
Nội dung lý thuyết: Tìm hiểu phương thức cài đặt công cụ phát triển Android (JDK, Android Studio, máy ảo Nexus S)
. Học cơ chế rẽ nhánh tệp tin theo đuôi mở rộng (.ios.js và .android.js) và sử dụng API Platform để tối ưu mã nguồn cho từng hệ điều hành
.
Thực hành dự án RNNYT:
Khởi chạy ứng dụng RNNYT trên máy ảo Android bằng lệnh react-native run-android
.
Sao chép logic gốc từ index.ios.js sang index.android.js làm điểm mốc bắt đầu
.
Thiết kế lại giao diện màn hình chính riêng cho Android (HomeScreen.android.js): Thay thế thành phần TabBarIOS của iOS bằng cấu trúc trình đơn ngăn kéo vuốt từ cạnh trái DrawerLayoutAndroid chuẩn Android
.
Viết lại trình đơn lưu tin tức (bookmark) khi nhấn giữ: Thay thế API ActionSheetIOS của iOS bằng thông báo dạng bong bóng ToastAndroid và API tạo độ rung phản hồi Vibration
.
Khai báo quyền rung  trong cấu hình hệ thống Android AndroidManifest.xml
.
Sửa lỗi giao diện về khoảng cách (Android hoạt động tốt hơn với margin trong khi iOS hoạt động tốt hơn với padding) và loại bỏ đường gạch dưới mặc định của ô nhập liệu TextInput trên Android
.
Bật hỗ trợ hoạt ảnh LayoutAnimation thử nghiệm trên Android bằng cách gọi hàm kích hoạt thông qua lớp UIManager trong mã JavaScript
.
🚀 PHẦN 4: NATIVE MODULES, KIỂM THỬ & PHÁT HÀNH (Chương 10 - Chương 12)
Chương 10: Sử dụng và Tự viết Native Module (Using and Writing Native Modules)
Mục tiêu học tập: Mở rộng sức mạnh của React Native bằng cách liên kết và tự xây dựng các thành phần cầu nối đến mã nguồn gốc (Native Code) của thiết bị
.
Thực hành dự án RNNYT:
Cài đặt thư viện biểu tượng bên thứ ba react-native-vector-icons và sử dụng công cụ react-native link để tự động nhúng các tài nguyên gốc vào thư mục gốc của iOS và Android nhằm xây dựng giao diện trang cá nhân (Profile)
.

|                                                                                      Tự xây dựng một Native Module tùy chỉnh (ImageLibraryManager) cho phép người dùng nhấn vào ảnh đại diện (avatar) trên trang Profile để chọn ảnh từ thư viện thiết bị                                                                                      |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|                                        Trên nền tảng iOS: Sử dụng Xcode viết lớp ImageLibraryManager bằng ngôn ngữ Objective-C kế thừa từ giao thức RCTBridgeModule, tích hợp trình chọn ảnh hệ thống UIImagePickerController và cấu hình mô tả quyền truy cập thư viện ảnh trong tệp Info.plist                                        |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                      Trên nền tảng Android: Sử dụng Android Studio viết mã nguồn bằng ngôn ngữ Java kế thừa lớp ReactContextBaseJavaModule và thực thi giao diện ActivityEventListener để bắt sự kiện chọn ảnh thành công                                                                      |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                                                                    Thực hành kiểm nghiệm 4 cơ chế giao tiếp dữ liệu hai chiều giữa Native và JavaScript:                                                                                                                                    |
|                                                                                                                                     Callbacks: Gửi hàm gọi lại phản hồi dữ liệu đường dẫn ảnh (filePath) về JavaScript                                                                                                                                     |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                                                                         Promises: Trả về kết quả thông qua cơ chế bất đồng bộ Resolve/Reject trong JS                                                                                                                                         |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                                  Events: Phát các sự kiện hệ thống ImageSelectionStarted và ImageSelectionEnded qua luồng phát sự kiện hệ thống gốc để JS lắng nghe bất cứ lúc nào                                                                                                  |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                                                                 Constants: Xuất các hằng số định nghĩa sẵn từ native code để sử dụng thống nhất trên JS                                                                                                                                 |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                                                                                Chương 11: Chuẩn bị phát hành ứng dụng (Preparing for Production)                                                                                                                                                |
|                                                                                            Mục tiêu học tập: Đảm bảo ứng dụng hoạt động ổn định không có lỗi, đạt hiệu năng tối đa 60fps mượt mà trước khi phân phối tới người dùng cuối                                                                                            |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                                                                                                    Thực hành kiểm thử (Testing):                                                                                                                                                                    |
|                                                                                                                                          Thiết lập và chạy bộ kiểm thử tự động sử dụng thư viện Jest mặc định                                                                                                                                          |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                                                             Viết các kịch bản kiểm thử đơn vị (Unit Test) cho các hàm xử lý dữ liệu tin tức reshapeNewsData                                                                                                                             |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                        Viết các kịch bản kiểm thử giao diện Component (Component test) bằng phương thức Snapshot Testing của Jest để kiểm chứng cấu trúc hiển thị của thành phần NewsItem                                                                                        |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                                                                                    Thực hành tối ưu hóa hiệu năng (Performance Optimization):                                                                                                                                                    |
|                                                                             Sử dụng bảng thông số Perf Monitor của React Native để theo dõi thời gian thực dung lượng RAM, vùng nhớ JSC, tổng số lượng View đang hiển thị và tốc độ khung hình (UI/JS Framerate)                                                                             |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                               Trích xuất và phân tích biểu đồ ngọn lửa (flame graph) bằng công cụ Systrace kết hợp công cụ vẽ đồ thị của trình duyệt Chrome chrome://tracing để tìm ra hiện tượng re-render thừa của thành phần NewsItem                                                               |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                                                                                     Thực hiện cải tiến mã nguồn để khôi phục hiệu năng:                                                                                                                                                     |
|                                                            Chuyển đổi component lớp NewsItem kế thừa từ Component sang sử dụng PureComponent để kích hoạt cơ chế so sánh nông (shallow equality) các thuộc tính đầu vào, tránh việc render lại khi bài viết không có thay đổi                                                            |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                      Tách nhỏ thành phần thanh tiến trình hiển thị tỷ lệ đọc báo thành một container riêng biệt (ProgressBarContainer), giúp cô lập vùng thay đổi trạng thái cuộn trang và không ảnh hưởng tới toàn bộ danh sách tin bên dưới                                                      |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                                                              Sửa hàm so sánh thay đổi bản ghi dữ liệu rowHasChanged của ListView tránh việc luôn trả về true                                                                                                                              |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                                                                Tối ưu hóa số lượng bản ghi render ban đầu bằng cách khai báo thuộc tính initialListSize={4}                                                                                                                                |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                               Kích hoạt thuộc tính Rasterize ảnh trên iOS shouldRasterizeIOS cho component Image và loại bỏ thư viện logger redux-logger trong môi trường sản phẩm bằng biến môi trường__DEV__                                                                               |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                       Sử dụng hàm điều phối requestAnimationFrame và InteractionManager để trì hoãn việc dựng các tác vụ nặng (như tính toán hoạt ảnh màu sắc) cho tới khi kết thúc hiệu ứng chuyển trang di động                                                                       |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                                                                                           Thực hành đóng gói và phân phối (Deploying):                                                                                                                                                           |
|                                                                                                                   Biên dịch chạy thử trực tiếp trên thiết bị di động cá nhân thực tế bằng chế độ gỡ lỗi hoặc đóng gói Release                                                                                                                   |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                          Trên nền tảng iOS: Thiết lập tài khoản Apple Developer, tạo Provisioning Profiles (nhóm Ad Hoc và App Store), đăng ký thông tin ứng dụng trên cổng iTunes Connect, tạo Launch Screen và ảnh đại diện AppIcon trực tiếp trong Xcode và xuất tệp lưu trữ (Archive) gửi lên Apple Review                          |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                     Trên nền tảng Android: Tạo khóa ký bảo mật cá nhân bằng công cụ dòng lệnh keytool, cấu hình tệp ký chữ ký số, kiểm thử biến thể release bằng lệnh react-native run-android --variant=release và chạy lệnh build tệp tin cài đặt ứng dụng cuối cùng app-release.apk bằng công cụ gradle                     |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                                                                           Chương 12: Công cụ và tài nguyên bổ sung (React Native Tools and Resources)                                                                                                                                           |
|                                                                                                         Mục tiêu học tập: Đánh giá các công cụ biên tập hỗ trợ tăng tốc viết code di động và tìm hiểu định hướng mở rộng ứng dụng                                                                                                         |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
|                                                                                         Nội dung lý thuyết: Đánh giá các tiện ích mở rộng từ Nuclide (dành cho Atom hỗ trợ Flow kiểm tra kiểu tĩnh) và tiện ích React Native Tools của Visual Studio Code                                                                                         |
|                                                                                                                                           . Giới thiệu công cụ tích hợp kéo thả Deco IDE dành riêng cho React Native                                                                                                                                           |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
| Mở rộng kiến thức: Khám phá các dự án đưa React Native vượt ra ngoài phạm vi di động như React Native Web (chuyển đổi giao diện di động sang các thẻ HTML chuẩn chạy trên trình duyệt web), React Native Windows (UWP) để đưa ứng dụng lên hệ điều hành Windows 10/Xbox, và React Native macOS dành cho máy tính để bàn |
|                                                                                                                                                                                    .                                                                                                                                                                                    |
